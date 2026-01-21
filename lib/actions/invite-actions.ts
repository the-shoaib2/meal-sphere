'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { generateGroupInvite, sendGroupInvitations } from '@/lib/services/groups-service';
import { revalidateTag } from 'next/cache';

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

export async function generateInviteTokenAction(groupId: string, role: string, expiresInDays?: number | null): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await generateGroupInvite(groupId, userId, role, expiresInDays);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Generate invite error:', error);
    return { error: error.message || 'Failed to generate invite token' };
  }
}

export async function sendGroupInvitationsAction(groupId: string, emails: string[], role: string = 'MEMBER'): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await sendGroupInvitations(groupId, userId, emails, role);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Send invitations error:', error);
    return { error: error.message || 'Failed to send invitations' };
  }
}
