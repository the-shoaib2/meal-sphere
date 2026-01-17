import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from '@/lib/utils/chart-utils';
import { getPeriodAwareWhereClause, validateActivePeriod } from '@/lib/utils/period-utils';


// Force dynamic rendering - don't pre-render during build
// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    // Get user's room memberships.
    const memberships = await prisma.roomMember.findMany({
      where: { userId: session.user.id },
      select: { roomId: true }
    });

    if (!memberships) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all room IDs the user is part of
    let roomIds = memberships.map((m) => m.roomId);

    // Fetch valid rooms to ensure they exist and get names
    const validRooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, name: true }
    });

    // Update roomIds to only include valid ones
    roomIds = validRooms.map(r => r.id);

    // Filter to requested group if needed
    if (groupId && groupId !== 'all') {
      if (!roomIds.includes(groupId)) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }
      roomIds = [groupId];
    }

    if (roomIds.length === 0) {
      return NextResponse.json({
        meals: [],
        expenses: [],
        shoppingItems: [],
        calculations: [],
        mealDistribution: [],
        expenseDistribution: [],
        monthlyExpenses: [],
        mealRateTrend: [],
        roomStats: []
      });
    }

    // --- OPTIMIZATION START ---

    // 1. Batch fetch active periods for all selected rooms
    const activePeriods = await prisma.mealPeriod.findMany({
      where: {
        roomId: { in: roomIds },
        status: 'ACTIVE'
      },
      select: { id: true, roomId: true, startDate: true, endDate: true }
    });

    const activePeriodIds = activePeriods.map(p => p.id);
    // Create a map for quick period lookup by roomId
    const periodMap = new Map<string, typeof activePeriods[0]>();
    activePeriods.forEach(p => periodMap.set(p.roomId, p));

    // 2. Batch fetch data only for active periods (using periodId index)
    // If a room has no active period, we effectively skip fetching massive history for it
    const [meals, expenses, shoppingItems, roomMembers] = await Promise.all([
      // Fetch meals
      activePeriodIds.length > 0 ? prisma.meal.findMany({
        where: { periodId: { in: activePeriodIds } },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }) : Promise.resolve([]),

      // Fetch expenses
      activePeriodIds.length > 0 ? prisma.extraExpense.findMany({
        where: { periodId: { in: activePeriodIds } },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }) : Promise.resolve([]),

      // Fetch shopping items
      activePeriodIds.length > 0 ? prisma.shoppingItem.findMany({
        where: { periodId: { in: activePeriodIds } },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }) : Promise.resolve([]),

      // Fetch member counts (grouped)
      prisma.roomMember.groupBy({
        by: ['roomId'],
        where: { roomId: { in: roomIds } },
        _count: { userId: true }
      })
    ]);

    // Create member count map
    const memberCounts = roomMembers.reduce((acc, curr) => {
      acc[curr.roomId] = curr._count.userId;
      return acc;
    }, {} as Record<string, number>);

    // 3. Perform calculations in memory
    const calculations = roomIds.map((roomId) => {
      const roomMeals = meals.filter(m => m.roomId === roomId);
      const roomExpenses = expenses.filter(e => e.roomId === roomId);
      const roomShopping = shoppingItems.filter(s => s.roomId === roomId);

      const totalMeals = roomMeals.length;
      const totalExpense = roomExpenses.reduce((sum, e) => sum + e.amount, 0) +
        roomShopping.reduce((sum, s) => sum + (s.quantity || 0), 0);

      const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;

      // Use period dates if available, otherwise calculate from data
      const period = periodMap.get(roomId);
      let startDate: Date, endDate: Date;

      if (period) {
        startDate = new Date(period.startDate);
        endDate = period.endDate ? new Date(period.endDate) : new Date();
      } else {
        // Fallback for rooms without active period (should be empty data usually)
        const dates = [...roomMeals, ...roomExpenses, ...roomShopping].map(item => item.date);
        startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
        endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
      }

      const roomName = validRooms.find(r => r.id === roomId)?.name || 'Unknown Room';

      return {
        id: roomId,
        roomId,
        roomName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalMeals,
        totalExpense,
        mealRate,
        memberCount: memberCounts[roomId] || 0,
      };
    });

    // Generate chart data
    const mealDistribution = generateMealCountData(meals);
    const expenseDistribution = generateExpenseData(expenses, shoppingItems);
    const mealRateTrend = generateMealRateTrendData(calculations);
    const monthlyExpenses = generateMonthlyExpenseData(expenses, shoppingItems);

    // Generate room stats
    const roomStats = calculations.map(calc => {
      const start = new Date(calc.startDate);
      const end = new Date(calc.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const activeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      return {
        roomId: calc.roomId,
        roomName: calc.roomName,
        totalMeals: calc.totalMeals,
        totalExpenses: calc.totalExpense,
        averageMealRate: calc.mealRate,
        memberCount: calc.memberCount,
        activeDays,
      };
    });

    return NextResponse.json({
      meals,
      expenses,
      shoppingItems,
      calculations,
      mealDistribution,
      expenseDistribution,
      monthlyExpenses,
      mealRateTrend,
      roomStats,
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

