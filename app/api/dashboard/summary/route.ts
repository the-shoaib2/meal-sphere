import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all groups the user is a member of
    const roomMemberships = await prisma.roomMember.findMany({
      where: { userId: session.user.id },
      include: { room: { include: { members: true } } },
    });
    const activeRooms = roomMemberships.length;
    const totalMembers = roomMemberships.reduce((acc, m) => acc + (m.room.members?.length || 0), 0);

    // Get current month range
    const { getCurrentMonthRange, calculateUserMealSummary } = await import('@/lib/meal-calculations');
    const { startDate, endDate } = getCurrentMonthRange();

    let totalMeals = 0;
    let totalCost = 0;
    let totalUserCost = 0;
    let totalPaid = 0;
    let mealRateSum = 0;
    let mealRateCount = 0;

    for (const membership of roomMemberships) {
      const summary = await calculateUserMealSummary(
        session.user.id,
        membership.roomId,
        startDate,
        endDate
      );
      totalMeals += summary.userMeals;
      totalCost += summary.totalCost;
      totalUserCost += summary.userCost;
      mealRateSum += summary.mealRate;
      mealRateCount += 1;
      // Get user's payments for this room in this month
      const payments = await prisma.payment.findMany({
        where: {
          userId: session.user.id,
          roomId: membership.roomId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
        select: { amount: true },
      });
      totalPaid += payments.reduce((sum, p) => sum + p.amount, 0);
    }

    // Weighted average meal rate (or just average if you want)
    const currentRate = mealRateCount > 0 ? mealRateSum / mealRateCount : 0;
    const myBalance = totalPaid - totalUserCost;

    return NextResponse.json({
      totalMeals,
      currentRate,
      myBalance,
      totalCost,
      activeRooms,
      totalMembers,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 200 });
  }
} 