import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from '@/lib/chart-utils';


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

    // Get user
    // Get user's room memberships
    // Avoid 'include: { room: true }' because it crashes if the relation is broken in DB.
    const memberships = await prisma.roomMember.findMany({
      where: { userId: session.user.id },
    });

    const userRoomIds = memberships.map((m) => m.roomId);

    // Verify user is a member of all selected rooms
    // We only check against the userRoomIds we found.
    // If a room in 'roomIds' does not exist in 'userRoomIds', it's unauthorized.
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

    // Fetch meals
    const meals = await prisma.meal.findMany({
      where: {
        roomId: { in: roomIds },
      },
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

    // Fetch expenses
    const expenses = await prisma.extraExpense.findMany({
      where: {
        roomId: { in: roomIds },
      },
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

    // Fetch shopping items
    const shoppingItems = await prisma.shoppingItem.findMany({
      where: {
        roomId: { in: roomIds },
      },
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

    // Get room member counts
    const roomMembers = await prisma.roomMember.findMany({
      where: {
        roomId: { in: roomIds },
      },
      select: {
        roomId: true,
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

        const room = roomMeals[0]?.room || roomExpenses[0]?.room || roomShopping[0]?.room;

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
      })
    );

    // Generate chart data
    const mealDistribution = generateMealCountData(meals);
    const expenseDistribution = generateExpenseData(expenses, shoppingItems);
    const mealRateTrend = generateMealRateTrendData(calculations);
    const monthlyExpenses = generateMonthlyExpenseData(expenses, shoppingItems);

    // Generate room stats
    const roomStats = roomIds.map(roomId => {
      const roomMeals = meals.filter(meal => meal.roomId === roomId);
      const roomExpenses = expenses.filter(expense => expense.roomId === roomId);
      const room = roomMeals[0]?.room || roomExpenses[0]?.room;

      const totalMeals = roomMeals.length;
      const totalExpenses = roomExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
        shoppingItems.filter(item => item.roomId === roomId)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
      const averageMealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;
      const activeDays = new Set(roomMeals.map(meal => meal.date.toDateString())).size;

      return {
        roomId,
        roomName: validRooms.find(r => r.id === roomId)?.name || 'Unknown Room',
        totalMeals,
        totalExpenses,
        averageMealRate,
        memberCount: memberCounts[roomId] || 0,
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
    console.error('Selected rooms analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
