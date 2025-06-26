import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from '@/lib/chart-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          include: {
            room: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all room IDs the user is a member of
    const roomIds = user.rooms.map((membership) => membership.roomId);

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
        roomStats: [],
      });
    }

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
        room: {
          select: { name: true },
        },
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
          roomName: room?.name || 'Unknown Room',
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
        roomName: room?.name || 'Unknown Room',
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
    console.error('All rooms analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 