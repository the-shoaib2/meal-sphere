'use server';

import { revalidatePath, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService, CreatePeriodData } from '@/lib/services/period-service';
import { updatePeriodMode } from '@/lib/services/groups-service';

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

export async function startPeriodAction(data: CreatePeriodData & { groupId: string }): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const { groupId, ...periodData } = data;
    
    const result = await PeriodService.startPeriod(groupId, userId, periodData);
    
    // Revalidation is handled in service (revalidateTag 'periods', 'group-[id]')
    // But we can add specific path revalidation if needed
    revalidatePath('/dashboard/periods');
    
    return { success: true, data: result.period };
  } catch (error: any) {
    console.error('Start period error:', error);
    return { error: error.message || 'Failed to start period' };
  }
}

export async function updatePeriodModeAction(groupId: string, mode: 'MONTHLY' | 'CUSTOM'): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await updatePeriodMode(groupId, userId, mode);
    
    revalidatePath('/dashboard/periods');
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Update period mode error:', error);
    return { error: error.message || 'Failed to update period mode' };
  }
}

export async function endPeriodAction(groupId: string, periodId?: string, endDate?: Date): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await PeriodService.endPeriod(groupId, userId, endDate, periodId);
    
    revalidatePath('/dashboard/periods');
    revalidateTag(`group-${groupId}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('End period error:', error);
    return { error: error.message || 'Failed to end period' };
  }
}

export async function lockPeriodAction(groupId: string, periodId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await PeriodService.lockPeriod(groupId, userId, periodId);
    
    revalidatePath('/dashboard/periods');
    revalidateTag(`group-${groupId}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Lock period error:', error);
    return { error: error.message || 'Failed to lock period' };
  }
}

export async function unlockPeriodAction(groupId: string, periodId: string, status: any): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await PeriodService.unlockPeriod(groupId, userId, periodId, status);
    
    revalidatePath('/dashboard/periods');
    revalidateTag(`group-${groupId}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Unlock period error:', error);
    return { error: error.message || 'Failed to unlock period' };
  }
}

export async function archivePeriodAction(groupId: string, periodId: string): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await PeriodService.archivePeriod(groupId, userId, periodId);
    
    revalidatePath('/dashboard/periods');
    revalidateTag(`group-${groupId}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Archive period error:', error);
    return { error: error.message || 'Failed to archive period' };
  }
}

export async function restartPeriodAction(groupId: string, periodId: string, data: { newName?: string, withData?: boolean }): Promise<ActionState> {
  try {
    const userId = await getUserId();
    const result = await PeriodService.restartPeriod(groupId, userId, periodId, data.newName, data.withData);
    
    revalidatePath('/dashboard/periods');
    revalidateTag(`group-${groupId}`);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Restart period error:', error);
    return { error: error.message || 'Failed to restart period' };
  }
}
