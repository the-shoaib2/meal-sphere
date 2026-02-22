"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { 
  createVote, 
  castVote, 
  deleteVote, 
  getVotes,
  updateVoteStatus
} from "@/lib/services/voting-service";
import { validateGroupAccess, validateAdminAccess } from "@/lib/auth/group-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/services/prisma";
import { VoteType } from "@prisma/client";

export async function createVoteAction(groupId: string, data: {
  title: string;
  description?: string;
  type: VoteType;
  startDate: string;
  endDate: string;
  options: any[];
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const access = await validateGroupAccess(groupId);
    if (!access.success) return { success: false, message: access.error };

    const result = await createVote(groupId, session.user.id, data);
    
    revalidatePath(`/groups/${groupId}`, 'page');
    revalidateTag(`votes-${groupId}`);

    return result;
  } catch (error: any) {
    console.error("Error creating vote:", error);
    return { success: false, message: error.message || "Failed to create vote" };
  }
}

export async function castVoteAction(groupId: string, voteId: string, candidateId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const access = await validateGroupAccess(groupId);
    if (!access.success) return { success: false, message: access.error };

    const result = await castVote(voteId, session.user.id, candidateId);
    
    revalidatePath(`/groups/${groupId}`, 'page');
    revalidateTag(`votes-${groupId}`);

    return result;
  } catch (error: any) {
    console.error("Error casting vote:", error);
    return { success: false, message: error.message || "Failed to cast vote" };
  }
}

export async function deleteVoteAction(groupId: string, voteId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const access = await validateGroupAccess(groupId);
    if (!access.success) return { success: false, message: access.error };

    if (!access.authResult) return { success: false, message: "Authorization failed" };
    // Service handles internal permission check (creator or admin)
    const result = await deleteVote(voteId, session.user.id, access.authResult.isAdmin);
    
    revalidatePath(`/groups/${groupId}`, 'page');
    revalidateTag(`votes-${groupId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting vote:", error);
    return { success: false, message: error.message || "Failed to delete vote" };
  }
}

export async function updateVoteAction(groupId: string, voteId: string, updateData: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const access = await validateGroupAccess(groupId);
    if (!access.success) return { success: false, message: access.error };

    if (!access.authResult) return { success: false, message: "Authorization failed" };

    const existingVote = await prisma.vote.findUnique({ where: { id: voteId } });
    if (!existingVote || (existingVote.userId !== session.user.id && !access.authResult.isAdmin)) {
      return { success: false, message: "Unauthorized" };
    }

    const updated = await prisma.vote.update({
      where: { id: voteId },
      data: {
        title: updateData.title,
        description: updateData.description,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        options: updateData.candidates ? JSON.stringify(updateData.candidates) : undefined
      }
    });

    revalidatePath(`/groups/${groupId}`, 'page');
    revalidateTag(`votes-${groupId}`);

    return { success: true, vote: updated };
  } catch (error: any) {
    console.error("Error updating vote:", error);
    return { success: false, message: error.message || "Failed to update vote" };
  }
}
