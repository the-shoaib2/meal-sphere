import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/services/prisma';
import { validateGroupAccess } from '@/lib/auth/group-auth';

/**
 * GET /api/groups/[id]/stats
 * Fetches record counts for various components of the group.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate access
    const access = await validateGroupAccess(groupId);
    if (!access.success) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Fetch counts in parallel
    const [
      mealCount,
      shoppingCount,
      paymentCount,
      expenseCount,
      memberCount
    ] = await Promise.all([
      prisma.meal.count({ where: { roomId: groupId } }),
      prisma.shoppingItem.count({ where: { roomId: groupId } }),
      prisma.payment.count({ where: { roomId: groupId } }),
      prisma.extraExpense.count({ where: { roomId: groupId } }),
      prisma.roomMember.count({ where: { roomId: groupId } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        meals: mealCount,
        shopping: shoppingCount,
        payments: paymentCount,
        expenses: expenseCount,
        members: memberCount,
      }
    });

  } catch (error) {
    console.error('Error fetching group stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
