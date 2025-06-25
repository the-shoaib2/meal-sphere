import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

async function calculateBalance(userId: string, roomId: string): Promise<number> {
  const transactions = await prisma.accountTransaction.findMany({
    where: {
      roomId,
      OR: [
        { targetUserId: userId },                    // User is the receiver
        { 
          AND: [
            { userId: userId },                      // User is the sender
            { targetUserId: userId }                 // AND user is also the target (self-transaction)
          ]
        }
      ],
    },
    select: {
      userId: true,
      targetUserId: true,
      amount: true,
    },
  });

  return transactions.reduce((balance, t) => {
    if (t.targetUserId === userId) {
      return balance + t.amount; // Money received (positive)
    }
    return balance;
  }, 0);
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

    // Get total expenses
    const totalExpenses = await prisma.extraExpense.findMany({
      where: { roomId },
      select: { amount: true },
    }).then(expenses => expenses.reduce((sum, expense) => sum + expense.amount, 0));

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
    const balanceData = await calculateAvailableBalance(session.user.id, groupId);
    const currentBalance = await calculateBalance(session.user.id, groupId);
    const { mealRate, totalMeals, totalExpenses } = await calculateMealRate(groupId);

    return NextResponse.json({
      totalUserMeals: balanceData.mealCount,
      totalAllMeals: totalMeals,
      currentRate: mealRate,
      currentBalance,
      availableBalance: balanceData.availableBalance,
      totalCost: balanceData.totalSpent,
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