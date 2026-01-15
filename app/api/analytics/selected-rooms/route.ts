import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from '@/lib/chart-utils';


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
    const roomIdsParam = searchParams.get('roomIds');

    if (!roomIdsParam) {
      return NextResponse.json({ error: 'No room IDs provided' }, { status: 400 });
    }

    const roomIds = roomIdsParam.split(',').filter(id => id.trim());

    if (roomIds.length === 0) {
      return NextResponse.json({ error: 'No valid room IDs provided' }, { status: 400 });
    }

    // Get user's room memberships
    const memberships = await prisma.roomMember.findMany({
      where: { userId: session.user.id },
      select: { roomId: true }
    });

    const userRoomIds = memberships.map((m) => m.roomId);

    // Verify user is a member of all selected rooms
    const unauthorizedRooms = roomIds.filter(roomId => !userRoomIds.includes(roomId));

    if (unauthorizedRooms.length > 0) {
      return NextResponse.json({
        error: 'Not a member of some selected rooms',
        unauthorizedRooms
      }, { status: 403 });
    }

    // Fetch existing rooms manually for names
    const validRooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, name: true }
    });

    // 1. Fetch active periods for selected rooms
    const activePeriods = await prisma.mealPeriod.findMany({
      where: {
        roomId: { in: roomIds },
        status: 'ACTIVE'
      },
      select: { id: true, roomId: true, startDate: true, endDate: true }
    });

    const activePeriodIds = activePeriods.map(p => p.id);
    const periodMap = new Map<string, typeof activePeriods[0]>();
    activePeriods.forEach(p => periodMap.set(p.roomId, p));

    // If no active periods found, we return empty data to avoid loading full history
    // This enforces the rule that analytics primarily serve the active period
    if (activePeriodIds.length === 0 && roomIds.length > 0) {
      // Return empty structure but with room info
      return NextResponse.json({
        meals: [],
        expenses: [],
        shoppingItems: [],
        calculations: roomIds.map(rid => ({
          id: rid,
          roomId: rid,
          roomName: validRooms.find(r => r.id === rid)?.name || 'Unknown',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          totalMeals: 0,
          totalExpense: 0,
          mealRate: 0,
          memberCount: 0
        })),
        mealDistribution: [],
        expenseDistribution: [],
        monthlyExpenses: [],
        mealRateTrend: [],
        roomStats: []
      });
    }

    const [meals, expenses, shoppingItems, roomMembers] = await Promise.all([
      prisma.meal.findMany({
        where: {
          roomId: { in: roomIds },
          periodId: { in: activePeriodIds } // Optimization: Filter by period
        },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.extraExpense.findMany({
        where: {
          roomId: { in: roomIds },
          periodId: { in: activePeriodIds }
        },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.shoppingItem.findMany({
        where: {
          roomId: { in: roomIds },
          periodId: { in: activePeriodIds }
        },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.roomMember.groupBy({
        by: ['roomId'],
        where: { roomId: { in: roomIds } },
        _count: { userId: true }
      })
    ]);

    const memberCounts = roomMembers.reduce((acc, curr) => {
      acc[curr.roomId] = curr._count.userId;
      return acc;
    }, {} as Record<string, number>);

    // Calculate meal rates for each room
    const calculations = roomIds.map((roomId) => {
      const roomMeals = meals.filter(meal => meal.roomId === roomId);
      const roomExpenses = expenses.filter(expense => expense.roomId === roomId);
      const roomShopping = shoppingItems.filter(item => item.roomId === roomId);

      const totalMeals = roomMeals.length;
      const totalExpense = roomExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
        roomShopping.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;

      const period = periodMap.get(roomId);
      let startDate: Date, endDate: Date;

      if (period) {
        startDate = new Date(period.startDate);
        endDate = period.endDate ? new Date(period.endDate) : new Date();
      } else {
        // Fallback (shouldn't happen with current logic but safe to keep)
        startDate = new Date();
        endDate = new Date();
      }

      return {
        id: roomId,
        roomId,
        roomName: validRooms.find(r => r.id === roomId)?.name || 'Unknown Room',
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
    const roomStats = roomIds.map(roomId => {
      const calc = calculations.find(c => c.roomId === roomId);
      if (!calc) return null;

      const roomMeals = meals.filter(meal => meal.roomId === roomId);
      const activeDays = new Set(roomMeals.map(meal => meal.date.toDateString())).size;

      return {
        roomId,
        roomName: validRooms.find(r => r.id === roomId)?.name || 'Unknown Room',
        totalMeals: calc.totalMeals,
        totalExpenses: calc.totalExpense,
        averageMealRate: calc.mealRate,
        memberCount: memberCounts[roomId] || 0,
        activeDays,
      };
    }).filter(Boolean);

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
    console.error('Selected rooms analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
