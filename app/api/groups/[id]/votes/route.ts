import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminAccess, checkGroupAccess, getGroupData } from "@/lib/auth/group-auth";
import { Role, VoteType } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";

// Simulate notification
function sendNotification(groupId: string, message: string) {
  // Replace with real notification logic
  console.log(`[Notification][Group ${groupId}]: ${message}`);
}

// Helper function to handle vote completion
function handleVoteCompletion(vote: any, winner: any, completionReason: string, totalVotes: number, totalMembers: number) {
  const voteTypeName = vote.type === 'MEAL_MANAGER' ? 'Manager Election' :
    vote.type === 'MEAL_CHOICE' ? 'Meal Preference' :
      vote.type || 'Vote';

  const notificationMessage = completionReason === 'majority_reached'
    ? `${voteTypeName} completed! Winner: ${winner.name} (Majority reached)`
    : `${voteTypeName} completed! Winner: ${winner.name} (All members voted)`;

  sendNotification(vote.roomId, notificationMessage);

  console.log(`Vote ${vote.id} completed:`, {
    title: vote.title,
    winner: winner.name,
    totalVotes,
    totalMembers,
    completionReason,
    completedAt: new Date()
  });
}

function getGroupIdFromUrl(req: NextRequest) {
  // /api/groups/[id]/votes
  const match = req.nextUrl.pathname.match(/groups\/(.*?)\//);
  return match ? match[1] : undefined;
}

// GET: List all votes for a group
export async function GET(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  // Authenticate user to get correct access rights
  const session = await getServerSession(authOptions);
  // If we can't authenticate, we can't reliably check access or get group data
  // However, proceeding with "system" might have been a legacy hack. 
  // Let's try to do it properly:
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const votes = await prisma.vote.findMany({ where: { roomId: String(groupId) } });

  // Get group data to calculate majority and get member info
  // Using real userId ensures we pass private group checks
  const group = await getGroupData(groupId, userId);

  if (!group) {
    // If group is null, user can't access it
    return NextResponse.json({ error: "Group not found or access denied" }, { status: 404 });
  }

  // Use the accurate count from database
  const totalMembers = group.totalMemberCount || group.members?.length || 1;
  const majority = Math.floor(totalMembers / 2) + 1;

  // Create a map of userId to user info for quick lookup
  // Note: group.members is limited to 100, so some voters might be missed.
  // Ideally we should fetch specific voters, but for now this prevents crashes.
  const userMap = new Map();
  if (group?.members) {
    group.members.forEach((member: any) => {
      userMap.set(member.userId, {
        id: member.userId,
        name: member.user.name || member.user.email || 'Unknown',
        image: member.user.image
      });
    });
  }

  const formattedVotes = await Promise.all(votes.map(async (vote) => {
    const options = vote.options ? JSON.parse(vote.options) : [];
    const results = vote.results ? JSON.parse(vote.results) : {};

    // Check if vote has expired and update if necessary
    let isActive = vote.isActive;
    let endDate = vote.endDate;
    let winner = null;

    if (isActive && vote.endDate && new Date() > new Date(vote.endDate)) {
      // Vote has expired, mark as inactive
      isActive = false;
      endDate = new Date();

      // Update the vote in the database
      await prisma.vote.update({
        where: { id: vote.id },
        data: {
          isActive: false,
          endDate: new Date(),
        }
      });

      // Send notification about expired vote
      sendNotification(groupId, `Vote "${vote.title}" has expired.`);
    }

    // Calculate total votes and get voter details
    const totalVotes = Object.values(results).reduce((sum: number, arr: unknown) =>
      sum + (Array.isArray(arr) ? arr.length : 0), 0
    );

    // Convert voter IDs to voter objects with user info
    const resultsWithVoters: Record<string, any[]> = {};
    Object.keys(results).forEach(candidateId => {
      const voterIds = results[candidateId] || [];
      resultsWithVoters[candidateId] = voterIds.map((userId: string) => userMap.get(userId) || { id: userId, name: 'Unknown', image: null });
    });

    // Calculate winner for completed votes
    if (!isActive) {
      for (const candidate of options) {
        if ((results[candidate.id]?.length || 0) >= majority) {
          winner = candidate;
          break;
        }
      }

      // If no majority winner, find the candidate with most votes (for completed votes)
      if (!winner && totalVotes > 0) {
        let maxVotes = 0;
        let winningCandidate = null;

        for (const candidate of options) {
          const candidateVotes = (results[candidate.id]?.length || 0);
          if (candidateVotes > maxVotes) {
            maxVotes = candidateVotes;
            winningCandidate = candidate;
          }
        }

        if (winningCandidate) {
          winner = winningCandidate;
        }
      }
    }

    // Add completion metadata for history
    const voteHistory = {
      completedAt: !isActive ? endDate : null,
      completionReason: !isActive ? (winner ? 'majority_reached' : 'time_expired') : null,
      totalMembers,
      majority,
      participationRate: totalMembers > 0 ? ((totalVotes / totalMembers) * 100).toFixed(1) : '0'
    };

    return {
      ...vote,
      isActive,
      endDate,
      options,
      results: resultsWithVoters, // Now contains voter objects instead of just IDs
      totalVotes,
      winner: winner || undefined,
      history: voteHistory,
    };
  }));

  return NextResponse.json({ votes: formattedVotes }, {
    headers: {
      'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30',
      'Vary': 'Cookie'
    }
  });
}

// POST: Create a new vote for a group
// Only admins can create votes, but only non-admins can be candidates.
export async function POST(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  // Check admin access
  const adminCheck = await validateAdminAccess(groupId);
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: adminCheck.status || 403 });
  }
  if (!adminCheck.authResult) {
    return NextResponse.json({ error: "Admin check failed" }, { status: 500 });
  }
  const adminUserId = adminCheck.authResult.userId;

  const data = await req.json();
  // Fetch group members to filter candidates
  const group = await getGroupData(groupId, adminUserId!);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const nonAdminMembers = group.members.filter((m: any) => ![Role.ADMIN, Role.MANAGER, Role.SUPER_ADMIN].includes(m.role));
  // Only allow non-admins as candidates
  const validCandidates = (data.candidates || []).filter((c: any) => nonAdminMembers.some((m: any) => m.userId === c.id));
  // Map frontend type to enum
  const typeMap: Record<string, string> = {
    manager: "MEAL_MANAGER",
    meal: "MEAL_CHOICE",
    accountant: "ACCOUNTANT",
    leader: "ROOM_LEADER",
    market_manager: "MARKET_MANAGER",
    group_decision: "GROUP_DECISION"
  };
  const prismaType = (typeMap[data.type] as VoteType) || VoteType.GROUP_DECISION;

  // Check if there's already an active vote of this type in the group
  const existingActiveVote = await prisma.vote.findFirst({
    where: {
      roomId: String(groupId),
      type: prismaType,
      isActive: true
    }
  });

  // Also check for any existing vote of this type by the same user
  const existingUserVote = await prisma.vote.findFirst({
    where: {
      roomId: String(groupId),
      type: prismaType,
      userId: String(adminUserId)
    }
  });

  if (existingActiveVote) {
    const voteTypeName = data.type === 'manager' ? 'Manager Election' :
      data.type === 'meal' ? 'Meal Preference' :
        data.type || 'vote';

    return NextResponse.json({
      error: `An active ${voteTypeName} already exists in this group. Please check the active votes section above and wait for it to complete or expire before creating a new one.`
    }, { status: 409 });
  }

  // If user has a completed vote of this type, allow creating a new one
  if (existingUserVote && !existingUserVote.isActive) {
    console.log(`User ${adminUserId} has a completed ${prismaType} vote, allowing new vote creation`);
    try {
      // Check if a GROUP_DECISION vote already exists for this user/room
      const existingGroupDecisionVote = await prisma.vote.findFirst({
        where: {
          roomId: String(groupId),
          type: VoteType.GROUP_DECISION,
          userId: String(adminUserId)
        }
      });
      if (existingGroupDecisionVote) {
        // Delete the old completed vote to avoid unique constraint error
        await prisma.vote.delete({ where: { id: existingUserVote.id } });
        console.log(`Deleted old completed vote ${existingUserVote.id} to allow new vote creation`);
      } else {
        // Archive the old completed vote by updating its type
        await prisma.vote.update({
          where: { id: existingUserVote.id },
          data: {
            type: VoteType.GROUP_DECISION, // Use GROUP_DECISION as archive type
            title: `${existingUserVote.title} (Archived)`,
            description: existingUserVote.description ? `${existingUserVote.description} - Archived to allow new vote` : 'Archived to allow new vote'
          }
        });
        console.log(`Archived old completed vote ${existingUserVote.id} to allow new vote creation`);
      }
      // Add a small delay to ensure the database update is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (archiveError) {
      console.error('Failed to archive old vote:', archiveError);
      return NextResponse.json({
        error: 'Failed to create new vote. Please try again or contact support.'
      }, { status: 500 });
    }
  }

  // Store candidates in options as JSON
  const candidates = validCandidates.map((c: any) => ({ id: c.id, name: c.name, image: c.image }));
  // Use provided startDate/endDate or defaults
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const endDate = data.endDate ? new Date(data.endDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  try {
    const vote = await prisma.vote.create({
      data: {
        type: prismaType as VoteType,
        title: data.title,
        description: data.description,
        startDate,
        endDate,
        isActive: true,
        userId: String(adminUserId),
        roomId: String(groupId),
        options: JSON.stringify(candidates),
        results: JSON.stringify({}), // empty at start
        isAnonymous: false,
      }
    });
    sendNotification(groupId, `A new ${data.type || "custom"} vote has started.`);
    return NextResponse.json({
      vote: {
        ...vote,
        options: candidates,
        results: {},
      }
    }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      // This happens when the same user tries to create multiple votes of the same type
      const voteTypeName = data.type === 'manager' ? 'Manager Election' :
        data.type === 'meal' ? 'Meal Preference' :
          data.type || 'vote';

      return NextResponse.json({
        error: `You have already created a ${voteTypeName} in this group. The system is trying to archive the previous vote to allow a new one. Please try again in a moment, or ask another admin to create the vote.`
      }, { status: 409 });
    }
    console.error('Vote creation error:', err);
    return NextResponse.json({
      error: 'Failed to create vote. Please try again.'
    }, { status: 500 });
  }
}

// PATCH: Cast a vote (voteId, candidateId, userId in body)
export async function PATCH(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });
  const { voteId, candidateId, userId } = await req.json();
  // Check group access (must be member)
  const access = await checkGroupAccess(groupId);
  if (!access.isAuthenticated || !access.isMember) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }
  if (access.userId !== userId) {
    return NextResponse.json({ error: "User mismatch" }, { status: 403 });
  }
  const vote = await prisma.vote.findFirst({ where: { id: String(voteId), roomId: String(groupId) } });
  if (!vote) return NextResponse.json({ error: "Vote not found" }, { status: 404 });
  if (!vote.isActive) return NextResponse.json({ error: "Vote is not active" }, { status: 400 });
  // Parse results and options
  const results = vote.results ? JSON.parse(vote.results) : {};
  const options = vote.options ? JSON.parse(vote.options) : [];
  // Prevent double voting
  if (Object.values(results).flat().includes(userId)) {
    return NextResponse.json({ error: "Already voted" }, { status: 400 });
  }
  // Add vote
  if (!results[candidateId]) results[candidateId] = [];
  results[candidateId].push(userId);
  // Check for majority
  const totalVotes = Object.values(results).reduce((sum: number, arr: unknown) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  const group = await getGroupData(groupId, userId);
  const totalMembers = group?.members?.length || 1;
  const majority = Math.floor(totalMembers / 2) + 1;
  let isActive = true;
  let winner = null;
  let endDate = vote.endDate;
  let completionReason = null;

  // Check if any candidate has reached majority
  for (const candidate of options) {
    if ((results[candidate.id]?.length || 0) >= majority) {
      isActive = false;
      winner = candidate;
      endDate = new Date();
      completionReason = 'majority_reached';
      break;
    }
  }

  // If no majority reached, check if all members have voted
  if (isActive && totalVotes >= totalMembers) {
    // Find the candidate with the most votes
    let maxVotes = 0;
    let winningCandidate = null;

    for (const candidate of options) {
      const candidateVotes = (results[candidate.id]?.length || 0);
      if (candidateVotes > maxVotes) {
        maxVotes = candidateVotes;
        winningCandidate = candidate;
      }
    }

    if (winningCandidate) {
      isActive = false;
      winner = winningCandidate;
      endDate = new Date();
      completionReason = 'all_members_voted';
    }
  }

  // Update vote with completion information
  const updateData: any = {
    results: JSON.stringify(results),
    isActive,
    endDate,
  };

  const updatedVote = await prisma.vote.update({
    where: { id: String(voteId) },
    data: updateData
  });

  // Send notifications for completed votes
  if (!isActive && winner && completionReason) {
    handleVoteCompletion(vote, winner, completionReason, totalVotes, totalMembers);
  }

  return NextResponse.json({
    vote: {
      ...updatedVote,
      options,
      results,
      winner: !isActive && winner ? winner : undefined,
      totalVotes,
    }
  });
}

// DELETE: Delete a vote (admin only)
export async function DELETE(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });
  const { voteId } = await req.json();
  // Check admin access
  const adminCheck = await validateAdminAccess(groupId);
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: adminCheck.status || 403 });
  }
  try {
    await prisma.vote.delete({ where: { id: String(voteId) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete vote." }, { status: 500 });
  }
}

// PUT: Edit a vote (admin only)
export async function PUT(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });
  const { voteId, title, description, endDate, options, type, candidates } = await req.json();
  // Check admin access
  const adminCheck = await validateAdminAccess(groupId);
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: adminCheck.status || 403 });
  }
  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (type !== undefined) updateData.type = type;
    if (candidates !== undefined) updateData.options = JSON.stringify(candidates);
    else if (options !== undefined) updateData.options = JSON.stringify(options);
    const updated = await prisma.vote.update({ where: { id: String(voteId) }, data: updateData });
    return NextResponse.json({ success: true, vote: updated });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update vote." }, { status: 500 });
  }
} 