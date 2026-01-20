'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { revalidatePath } from 'next/cache';

export async function setCurrentGroupAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    if (!groupId || typeof groupId !== 'string') {
      return { error: 'Group ID is required' };
    }

    // Optimized transaction: find current and update both in one trip if possible,
    // or use a targeted update.
    await prisma.$transaction(async (tx) => {
      // 1. Unset any currently active group for this user
      await tx.roomMember.updateMany({
        where: {
          userId: session.user.id,
          isCurrent: true,
          NOT: {
            roomId: groupId
          }
        },
        data: { isCurrent: false }
      });

      // 2. Set the new group as active
      await tx.roomMember.update({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: groupId
          }
        },
        data: { isCurrent: true }
      });
    });

    // Surgical cache invalidation
    // PURGE the user's group data cache by revalidating ALL group-dependent paths
    revalidatePath('/(auth)', 'layout');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/periods', 'page');
    revalidatePath('/groups', 'page');
    revalidatePath('/meals', 'page');
    revalidatePath('/shopping', 'page');
    revalidatePath('/expenses', 'page');
    revalidatePath('/account-balance', 'page');
    revalidatePath('/calculations', 'page');
    
    // Also revalidate nested routes for groups if any
    revalidatePath('/groups/[id]', 'page');
    

    return { success: true };
  } catch (error) {
    console.error('Error in setCurrentGroupAction:', error);
    return { error: 'Failed to set current group' };
  }
}
