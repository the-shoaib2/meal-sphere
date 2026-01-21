'use server';

import { prisma } from '@/lib/services/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';

export async function setCurrentGroupAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { error: 'Not authenticated' };
    }

    const userId = session.user.id;

    // Verify membership
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId: groupId,
        },
      },
    });

    if (!membership) {
      return { error: 'Not a member of this group' };
    }

    // Transaction to update current group
    await prisma.$transaction(async (tx) => {
      // 1. Unset current for all other groups
      await tx.roomMember.updateMany({
        where: {
          userId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });

      // 2. Set current for the target group
      await tx.roomMember.update({
        where: {
          userId_roomId: {
            userId,
            roomId: groupId,
          },
        },
        data: {
          isCurrent: true,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error setting current group:', error);
    return { error: 'Failed to set current group' };
  }
}
