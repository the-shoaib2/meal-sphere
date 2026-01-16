import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

async function calculateBalance(userId: string, roomId: string): Promise<number> {
  // Calculate money received (targetUserId = user)
  const received = await prisma.accountTransaction.aggregate({
    where: {
      roomId,
      targetUserId: userId,
      // Exclude self-transactions if needed, though they net to zero in balance usually
      // but logic above was: if target==user -> +amount.
    },
    _sum: {
      amount: true,
    },
  });

  // Calculate money sent (userId = user) if needed for logic, 
  // but previous logic ONLY summed where t.targetUserId === userId.
  // Wait, previous logic:
  // return transactions.reduce((balance, t) => {
  //   if (t.targetUserId === userId) {
  //     return balance + t.amount; // Money received (positive)
  //   }
  //   return balance;
  // }, 0);

  // The previous logic ONLY added amounts where user is target. 
  // It completely IGNORED money sent by the user (userId === userId).
  // Assuming the previous logic was correct in INTENT (calculating "inflow" or "credit"?), 
  // I will match the behavior: Sum amount where targetUserId == userId.

  return received._sum.amount || 0;
}

async function calculateUserMealCount(userId: string, roomId: string): Promise<number> {
  try {
    return await prisma.meal.count({
      where: { userId, roomId },
    });
  } catch (error) {
    console.error('Error calculating user meal count:', error);
    return 0;
  }
}

async function calculateMealRate(roomId: string): Promise<{ mealRate: number; totalMeals: number; totalExpenses: number }> {
  try {
    // Get total meals in the room
    const totalMeals = await prisma.meal.count({
      where: { roomId },
    });

    // Get total expenses using aggregation
    const expenseAgg = await prisma.extraExpense.aggregate({
      where: { roomId },
      _sum: { amount: true },
    });
    const totalExpenses = expenseAgg._sum.amount || 0;

    // Calculate meal rate
    const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

    return { mealRate, totalMeals, totalExpenses };
  } catch (error) {
    console.error('Error calculating meal rate:', error);
    return { mealRate: 0, totalMeals: 0, totalExpenses: 0 };
  }
}

async function calculateAvailableBalance(userId: string, roomId: string): Promise<{
  availableBalance: number;
  totalSpent: number;
  mealCount: number;
  mealRate: number;
}> {
  try {
    const [balance, mealCount, { mealRate }] = await Promise.all([
      calculateBalance(userId, roomId),
      calculateUserMealCount(userId, roomId),
      calculateMealRate(roomId),
    ]);

    const totalSpent = mealCount * mealRate;
    const availableBalance = balance - totalSpent;

    return {
      availableBalance,
      totalSpent,
      mealCount,
      mealRate,
    };
  } catch (error) {
    console.error('Error calculating available balance:', error);
    return {
      availableBalance: 0,
      totalSpent: 0,
      mealCount: 0,
      mealRate: 0,
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    // Check if user is a member of this group
    const membership = await prisma.roomMember.findFirst({
      where: {
        userId: session.user.id,
        roomId: groupId
      },
      include: { room: { include: { members: true } } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Calculate data for this specific group
    // Optimization: calculateAvailableBalance already calls calculateBalance and calculateMealRate internally using Promise.all
    const balanceData = await calculateAvailableBalance(session.user.id, groupId);

    // We need currentBalance explicitly which is returned by calculateBalance.
    // To avoid calling it again, we should refactor availableBalance to return all components or run them in parallel here.

    // Better approach: Run them purely in parallel here to avoid hidden dependencies
    const [userMealCount, { mealRate, totalMeals, totalExpenses }, currentBalance] = await Promise.all([
      calculateUserMealCount(session.user.id, groupId),
      calculateMealRate(groupId),
      calculateBalance(session.user.id, groupId)
    ]);

    const totalSpent = userMealCount * mealRate;
    const availableBalance = currentBalance - totalSpent;

    return NextResponse.json({
      totalUserMeals: userMealCount,
      totalAllMeals: totalMeals,
      currentRate: mealRate,
      currentBalance,
      availableBalance,
      totalCost: totalSpent,
      activeRooms: 1, // This group only
      totalActiveGroups: 1, // This group only
      totalMembers: membership.room.members?.length || 0,
      groupId,
      groupName: membership.room.name,
    });

  } catch (error) {
    console.error('Error fetching group dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to fetch group dashboard summary' }, { status: 500 });
  }
} 