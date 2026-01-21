'use server';

import { revalidatePath, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createGroup, updateGroup, deleteGroup, joinGroup, CreateGroupData, UpdateGroupData } from '@/lib/services/groups-service';
import { cacheDelete } from '@/lib/cache/cache-service';

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
    const group = await updateGroup(groupId, userId, data);
    
    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    revalidateTag(`group-${groupId}`);
    
    return { success: true, data: group };
  } catch (error: any) {
    console.error('Update group error:', error);
    return { error: error.message || 'Failed to update group' };
  }
}

export async function deleteGroupAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await deleteGroup(groupId, userId);
    
    revalidatePath('/groups');
    revalidateTag('groups');
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete group error:', error);
    return { error: error.message || 'Failed to delete group' };
  }
}

export async function joinGroupAction(groupId: string, password?: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await joinGroup(groupId, userId, password);
    
    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Join group error:', error);
    return { error: error.message || 'Failed to join group' };
  }
}

export async function createJoinRequestAction(groupId: string, message?: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await import('@/lib/services/groups-service').then(m => m.createJoinRequest(groupId, userId, message));
    
    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`join-requests-${groupId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Create join request error:', error);
    return { error: error.message || 'Failed to create join request' };
  }
}

export async function checkJoinStatusAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const status = await import('@/lib/services/groups-service').then(m => m.getJoinRequestStatus(groupId, userId));
    return { success: true, data: status };
  } catch (error: any) {
    return { error: error.message || 'Failed to check status' };
  }
}

export async function leaveGroupAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await import('@/lib/services/groups-service').then(m => m.leaveGroup(groupId, userId));
    
    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`user-groups`);
    revalidateTag(`group-${groupId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Leave group error:', error);
    return { error: error.message || 'Failed to leave group' };
  }
}

export async function processJoinRequestAction(requestId: string, action: 'approve' | 'reject'): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await import('@/lib/services/groups-service').then(m => m.processJoinRequest(requestId, action, userId));
    
    // Revalidating tags is handled in service, but we can adhere to pattern here if needed,
    // though service does it.
    
    return { success: true };
  } catch (error: any) {
    console.error('Process join request error:', error);
    return { error: error.message || 'Failed to process request' };
  }
}

export async function setCurrentGroupAction(groupId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    await import('@/lib/services/groups-service').then(m => m.setCurrentGroup(groupId, userId));
    
    revalidatePath('/groups');
    revalidateTag('user-groups');
    revalidateTag('groups');
    
    return { success: true };
  } catch (error: any) {
    console.error('Set current group error:', error);
    return { error: error.message || 'Failed to set active group' };
  }
}
