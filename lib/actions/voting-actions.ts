'use server';

import { revalidatePath, revalidateTag as _revalidateTag } from "next/cache";
const revalidateTag = _revalidateTag as any;
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { createVote, getVote, getVotes, castVote, deleteVote, VotingType } from "@/lib/services/voting-service";
import { Candidate } from "@/types/group";

export type ActionState = {
  success?: boolean;
  error?: string;
  data?: any;
};

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function createVoteAction(
  roomId: string,
  data: {
    title: string;
    description?: string;
    type: VotingType;
    startDate: string;
    endDate: string;
    options: Candidate[];
  }
): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await createVote(roomId, userId, data);
    
    revalidatePath(`/groups/${roomId}`);
    revalidateTag(`votes-${roomId}`);
    
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Create vote error:', error);
    return { error: error.message || 'Failed to create vote' };
  }
}

export async function castVoteAction(voteId: string, candidateId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await castVote(voteId, userId, candidateId);
    
    if (result.success && result.data) {
        revalidatePath(`/groups/${result.data.roomId}`);
        revalidateTag(`votes-${result.data.roomId}`);
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Cast vote error:', error);
    return { error: error.message || 'Failed to cast vote' };
  }
}

export async function deleteVoteAction(voteId: string, roomId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await deleteVote(voteId, userId);
    
    revalidatePath(`/groups/${roomId}`);
    revalidateTag(`votes-${roomId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete vote error:', error);
    return { error: error.message || 'Failed to delete vote' };
  }
}

export async function getVoteAction(voteId: string): Promise<ActionState> {
  try {
    const vote = await getVote(voteId);
    return { success: true, data: vote };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch vote' };
  }
}

export async function getVotesAction(roomId: string): Promise<ActionState> {
  try {
    const votes = await getVotes(roomId);
    return { success: true, data: votes };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch votes' };
  }
}

