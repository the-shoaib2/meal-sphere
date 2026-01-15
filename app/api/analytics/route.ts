import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from '@/lib/chart-utils';
import { getPeriodAwareWhereClause, validateActivePeriod } from '@/lib/period-utils';


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
    // We do NOT use include: { room: true } here because if a room is deleted but the member exists (orphan),
    // Prisma throws "Inconsistent query result: Field room is required to return data, got `null` instead."
    const memberships = await prisma.roomMember.findMany({
      where: { userId: session.user.id },
    });

    if (!memberships) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all room IDs the user is part of
    const allRoomIds = memberships.map((m) => m.roomId);

    // Fetch only the rooms that actually exist
    const validRooms = await prisma.room.findMany({
      where: {
        id: { in: allRoomIds },
      },
    });

    // Filter memberships to only those that correspond to a valid room
    const validMemberships = memberships.filter(m =>
      validRooms.some(r => r.id === m.roomId)
    );

    // Get room IDs from valid memberships
    let roomIds = validRooms.map(r => r.id);

    // Filter to requested group if needed
    if (groupId && groupId !== 'all') {
      const isMember = validMemberships.some(m => m.roomId === groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }
      roomIds = [groupId];
    }

    // Fetch meals with period filtering
    const mealsPromises = roomIds.map(async (roomId) => {
      const whereClause = await getPeriodAwareWhereClause(roomId, {
        roomId: roomId,
      });

      if (whereClause.id === null) {
        return [];
      }

      return prisma.meal.findMany({
        where: whereClause,
        include: {
          room: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
      });
    });

    const mealsArrays = await Promise.all(mealsPromises);
    const meals = mealsArrays.flat();

    // Fetch expenses with period filtering
    const expensesPromises = roomIds.map(async (roomId) => {
      const whereClause = await getPeriodAwareWhereClause(roomId, {
        roomId: roomId,
      });

      if (whereClause.id === null) {
        return [];
      }

      return prisma.extraExpense.findMany({
        where: whereClause,
        include: {
          room: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
      });
    });

    const expensesArrays = await Promise.all(expensesPromises);
    const expenses = expensesArrays.flat();

    // Fetch shopping items with period filtering
    const shoppingPromises = roomIds.map(async (roomId) => {
      const whereClause = await getPeriodAwareWhereClause(roomId, {
        roomId: roomId,
      });

      if (whereClause.id === null) {
        return [];
      }

      return prisma.shoppingItem.findMany({
        where: whereClause,
        include: {
          room: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
      });
    });

    const shoppingArrays = await Promise.all(shoppingPromises);
    const shoppingItems = shoppingArrays.flat();

    // Get room member counts
    const roomMembers = await prisma.roomMember.findMany({
      where: {
        roomId: { in: roomIds },
      },
      select: {
        roomId: true,
        // Remove room include here as it might crash if other members have broken links too
        // We only need roomId for counting
      },
    });

    const memberCounts = roomMembers.reduce((acc, member) => {
      acc[member.roomId] = (acc[member.roomId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate meal rates for each room
    const calculations = await Promise.all(
      roomIds.map(async (roomId) => {
        const roomMeals = meals.filter(meal => meal.roomId === roomId);
        const roomExpenses = expenses.filter(expense => expense.roomId === roomId);
        const roomShopping = shoppingItems.filter(item => item.roomId === roomId);

        const totalMeals = roomMeals.length;
        const totalExpense = roomExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
          roomShopping.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;

        const dates = [...roomMeals, ...roomExpenses, ...roomShopping].map(item => item.date);
        const startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
        const endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

        const roomName = validRooms.find(r => r.id === roomId)?.name || 'Unknown Room';

        return {
          id: roomId,
          roomId,
          roomName: roomName,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalMeals,
          totalExpense,
          mealRate,
          memberCount: memberCounts[roomId] || 0,
        };
      })
    );

    // Generate chart data
    const mealDistribution = generateMealCountData(meals);
    const expenseDistribution = generateExpenseData(expenses, shoppingItems);
    const mealRateTrend = generateMealRateTrendData(calculations);
    const monthlyExpenses = generateMonthlyExpenseData(expenses, shoppingItems);

    // Generate room stats
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
