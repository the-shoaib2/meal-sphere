import { prisma } from "@/lib/services/prisma";
import { Vote, Candidate, Voter } from "@/types/group";
import { revalidateTag, unstable_cache } from "next/cache";
import { VoteType } from "@prisma/client";

export async function createVote(
  roomId: string,
  createdById: string,
  data: {
    title: string;
    description?: string;
    type: VoteType;
    startDate: string;
    endDate: string;
    options: Candidate[];
  }
) {
  try {
    const vote = await prisma.vote.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        room: { connect: { id: roomId } },
        user: { connect: { id: createdById } },
        options: JSON.stringify(data.options),
        results: JSON.stringify({}), 
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });
    
    // Notify all members about the new vote
    const groupMembers = await prisma.roomMember.findMany({
      where: { roomId, userId: { not: createdById } },
      select: { userId: true }
    });

    if (groupMembers.length > 0) {
      await prisma.notification.createMany({
        data: groupMembers.map(member => ({
          userId: member.userId,
          type: 'GENERAL',
          message: `A new vote "${data.title}" has been started in your group.`
        }))
      });
    }

    return { success: true, data: formatVote(vote) };
  } catch (error) {
    console.error("Error creating vote:", error);
    throw new Error("Failed to create vote");
  }
}

export async function getVote(voteId: string) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { id: voteId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });
    return vote ? formatVote(vote) : null;
  } catch (error) {
    console.error("Error fetching vote:", error);
    return null;
  }
}

export async function getVotes(roomId: string) {
  const cacheKey = `votes-${roomId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      try {
        const votes = await prisma.vote.findMany({
          where: { roomId },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        });

        // Check for expired votes and update status
        const now = new Date();
        const updates = votes.filter(v => v.isActive && new Date(v.endDate) < now);
        
        if (updates.length > 0) {
          await Promise.all(updates.map(v => updateVoteStatus(v.id, false)));
          
          return votes.map(v => {
            if (v.isActive && new Date(v.endDate) < now) {
               return { ...v, isActive: false };
            }
            return v;
          }).map(formatVote);
        }

        return votes.map(formatVote);
      } catch (error) {
        console.error("Error fetching votes:", error);
        return [];
      }
    },
    [cacheKey, 'v1-votes'],
    {
      revalidate: 60, // Cache for 1 minute
      tags: [`votes-${roomId}`]
    }
  );

  return cachedFn();
}

export async function updateVoteStatus(voteId: string, isActive: boolean) {
  const vote = await prisma.vote.update({
    where: { id: voteId },
    data: { isActive },
    select: { roomId: true, title: true, results: true, options: true }
  });

  if (!isActive) {
    // Vote just ended, notify members
    const groupMembers = await prisma.roomMember.findMany({
      where: { roomId: vote.roomId },
      select: { userId: true }
    });

    if (groupMembers.length > 0) {
      let winnerText = "The results are in.";
      
      const results = typeof vote.results === 'string' 
        ? JSON.parse(vote.results) 
        : (vote.results || {});
        
      const options = typeof vote.options === 'string'
        ? JSON.parse(vote.options)
        : (vote.options || []);

      const candidateVotes = Object.entries(results as Record<string, any[]>).map(([id, voters]) => ({
        id, count: Array.isArray(voters) ? voters.length : 0
      }));

      if (candidateVotes.length > 0) {
        candidateVotes.sort((a, b) => b.count - a.count);
        const winnerId = candidateVotes[0].id;
        const winnerObj = options.find((o: any) => o.id === winnerId);
        
        if (winnerObj && candidateVotes[0].count > 0) {
          winnerText = `${winnerObj.name} won with ${candidateVotes[0].count} votes.`;
        }
      }

      await prisma.notification.createMany({
        data: groupMembers.map(member => ({
          userId: member.userId,
          type: 'GENERAL',
          message: `The vote "${vote.title}" has concluded. ${winnerText}`
        }))
      });
    }
  }
}

export async function castVote(voteId: string, userId: string, candidateId: string) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { id: voteId }
    });

    if (!vote) throw new Error("Vote not found");
    if (!vote.isActive) throw new Error("Vote is no longer active");
    if (new Date(vote.endDate) < new Date()) throw new Error("Vote has expired");

    const results: Record<string, Voter[]> = (typeof vote.results === 'string' ? JSON.parse(vote.results) : (vote.results as any)) || {};
    
    // Check if user has already voted
    const hasVoted = Object.values(results).some((voters: Voter[]) => 
      Array.isArray(voters) && voters.some((v: Voter) => v.id === userId)
    );

    if (hasVoted) throw new Error("You have already voted in this poll");

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true }
    });

    if (!user) throw new Error("User not found");

    // Update results
    if (!results[candidateId]) {
      results[candidateId] = [];
    }
    results[candidateId].push({
      id: user.id,
      name: user.name || 'Unknown',
      image: user.image || undefined
    } as Voter);

    const updatedVote = await prisma.vote.update({
      where: { id: voteId },
      data: {
        results: JSON.stringify(results),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });

    return { success: true, data: formatVote(updatedVote) };
  } catch (error) {
    console.error("Error casting vote:", error);
    throw error;
  }
}

export async function deleteVote(voteId: string, userId: string, isAdmin: boolean = false) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { id: voteId }
    });

    if (!vote) throw new Error("Vote not found");
    if (vote.userId !== userId && !isAdmin) throw new Error("Unauthorized");

    await prisma.vote.delete({
      where: { id: voteId }
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting vote:", error);
    throw error;
  }
}

// Helper to format prisma result to our interface
function formatVote(vote: any): Vote {
  const results = typeof vote.results === 'string' 
    ? (JSON.parse(vote.results) as Record<string, Voter[]>) 
    : (vote.results as Record<string, Voter[]> || {});
    
  const totalVotes = Object.values(results).reduce((acc: number, voters: Voter[]) => 
    acc + (Array.isArray(voters) ? voters.length : 0), 0);

  return {
    ...vote,
    createdBy: vote.user, 
    startDate: new Date(vote.startDate),
    endDate: new Date(vote.endDate),
    createdAt: new Date(vote.createdAt),
    updatedAt: new Date(vote.updatedAt),
    options: typeof vote.options === 'string' ? JSON.parse(vote.options) : (vote.options as Candidate[]),
    results: results,
    totalVotes: totalVotes,
    createdById: vote.userId, // Map userId to createdById for the Vote interface
  };
}
