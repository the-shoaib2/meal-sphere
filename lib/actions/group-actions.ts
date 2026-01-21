'use server';

import { revalidatePath, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { 
  createGroup, 
  updateGroup, 
  deleteGroup, 
  joinGroup, 
  createJoinRequest,
  getJoinRequestStatus,
  leaveGroup,
  processJoinRequest,
  setCurrentGroup,
  generateGroupInvite,
  sendGroupInvitations,
  CreateGroupData, 
  UpdateGroupData 
} from '@/lib/services/groups-service';
import { prisma } from '@/lib/services/prisma';

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

async function validateAdminAccess(groupId: string, userId: string) {
  const membership = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId: groupId,
      },
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
}

export async function createGroupAction(data: CreateGroupData): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const group = await createGroup({ ...data, userId });
    
    revalidatePath('/groups');
    revalidateTag('user-groups');
    revalidateTag('groups');
    
    return { success: true, data: group };
  } catch (error: any) {
    console.error('Create group error:', error);
    return { error: error.message || 'Failed to create group' };
  }
}

export async function updateGroupAction(groupId: string, data: UpdateGroupData): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await validateAdminAccess(groupId, userId);
    
    const group = await updateGroup(groupId, data);
    
    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    revalidateTag(`group-${groupId}`);
    revalidateTag('groups');
    
    return { success: true, data: group };
  } catch (error: any) {
    console.error('Update group error:', error);
    return { error: error.message || 'Failed to update group' };
  }
}

export async function deleteGroupAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    
    const group = await prisma.room.findUnique({ where: { id: groupId } });
    if (!group) throw new Error("Group not found");
    if (group.createdBy !== userId) throw new Error("Unauthorized: Only creator can delete group");
    
    await deleteGroup(groupId);
    
    revalidatePath('/groups');
    revalidateTag('groups');
    revalidateTag(`user-${userId}`);
    revalidateTag(`group-${groupId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete group error:', error);
    return { error: error.message || 'Failed to delete group' };
  }
}

export async function joinGroupAction(groupId: string, password?: string, token?: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await joinGroup(groupId, userId, password, token);
    
    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`group-${groupId}`);
    revalidateTag('groups');
    revalidateTag(`user-${userId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Join group error:', error);
    return { error: error.message || 'Failed to join group' };
  }
}

export async function createJoinRequestAction(groupId: string, message?: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await createJoinRequest(groupId, userId, message);
    
    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`join-requests-${groupId}`);
    revalidateTag(`group-${groupId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Create join request error:', error);
    return { error: error.message || 'Failed to create join request' };
  }
}

export async function checkJoinStatusAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const status = await getJoinRequestStatus(groupId, userId);
    return { success: true, data: status };
  } catch (error: any) {
    return { error: error.message || 'Failed to check status' };
  }
}

export async function leaveGroupAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await leaveGroup(groupId, userId);
    
    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`user-groups`);
    revalidateTag(`group-${groupId}`);
    revalidateTag('groups');
    revalidateTag(`user-${userId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Leave group error:', error);
    return { error: error.message || 'Failed to leave group' };
  }
}

export async function processJoinRequestAction(requestId: string, action: 'approve' | 'reject'): Promise<ActionState> {
  try {
    const userId = await getUserId();
    
    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      select: { roomId: true, userId: true }
    });
    if (!request) throw new Error("Request not found");
    
    await validateAdminAccess(request.roomId, userId);
    
    await processJoinRequest(requestId, action);
    
    revalidateTag(`group-${request.roomId}`);
    revalidateTag(`user-${request.userId}`);
    revalidatePath(`/groups/${request.roomId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Process join request error:', error);
    return { error: error.message || 'Failed to process request' };
  }
}

export async function setCurrentGroupAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    
    // Check membership
    const membership = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId: groupId } }
    });
    if (!membership) throw new Error("Not a member of this group");
    
    await setCurrentGroup(groupId, userId);
    
    revalidatePath('/groups');
    revalidateTag('user-groups');
    revalidateTag('groups');
    revalidateTag(`user-${userId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Set current group error:', error);
    return { error: error.message || 'Failed to set active group' };
  }
}

export async function generateGroupInviteAction(
  groupId: string, 
  data: { role: string; expiresInDays: number | null }
): Promise<ActionState> {
  try {
    const userId = await getUserId();
    
    // Permission check (handled inside service too, but good to be explicit for revalidation)
    await validateAdminAccess(groupId, userId);
    
    const result = await generateGroupInvite(groupId, userId, data.role, data.expiresInDays ?? undefined);
    
    revalidateTag(`group-${groupId}-invites`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Generate invite error:', error);
    return { error: error.message || 'Failed to generate invite' };
  }
}

export async function sendGroupInvitationsAction(
  groupId: string, 
  data: { emails: string[]; role: string }
): Promise<ActionState> {
  try {
    const userId = await getUserId();
    
    await validateAdminAccess(groupId, userId);
    
    const result = await sendGroupInvitations(groupId, userId, data.emails, data.role);
    
    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`group-${groupId}-invites`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Send invitations error:', error);
    return { error: error.message || 'Failed to send invitations' };
  }
}

