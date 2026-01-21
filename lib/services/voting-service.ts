import { prisma } from "@/lib/services/prisma";
import { Vote, Candidate } from "@/types/group";
import { unstable_cache } from "next/cache";

// Force dynamic since we're using sensitive data
// export const dynamic = 'force-dynamic';

export type VotingType = 'MEAL_MANAGER' | 'MEAL_CHOICE' | 'ACCOUNTANT' | 'ROOM_LEADER' | 'MARKET_MANAGER' | 'GROUP_DECISION' | 'EVENT_ORGANIZER' | 'CLEANING_MANAGER' | 'TREASURER' | 'CUSTOM';

export async function createVote(
  roomId: string,
  createdById: string,
  data: {
    title: string;
    description?: string;
    type: VotingType;
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
      // Refetch to get updated status
      return getVotes(roomId);
    }

    return votes.map(formatVote);
  } catch (error) {
    console.error("Error fetching votes:", error);
    return [];
  }
}

async function updateVoteStatus(voteId: string, isActive: boolean) {
  await prisma.vote.update({
    where: { id: voteId },
    data: { isActive }
  });
}

export async function castVote(voteId: string, userId: string, candidateId: string) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { id: voteId }
    });

    if (!vote) throw new Error("Vote not found");
    if (!vote.isActive) throw new Error("Vote is no longer active");
    if (new Date(vote.endDate) < new Date()) throw new Error("Vote has expired");

    const results = (typeof vote.results === 'string' ? JSON.parse(vote.results) : (vote.results as any)) || {};
    
    // Check if user has already voted
    const hasVoted = Object.values(results).some((voters: any) => 
      Array.isArray(voters) && voters.some((v: any) => v.id === userId)
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
      image: user.image
    });

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

export async function deleteVote(voteId: string, userId: string) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { id: voteId }
    });

    if (!vote) throw new Error("Vote not found");
    if (vote.userId !== userId) throw new Error("Unauthorized");

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
  const results = typeof vote.results === 'string' ? JSON.parse(vote.results) : (vote.results as Record<string, any[]>);
  const totalVotes = Object.values(results || {}).reduce((acc: number, voters: any) => acc + (Array.isArray(voters) ? voters.length : 0), 0);

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
  };
}
