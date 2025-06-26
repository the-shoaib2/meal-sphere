import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's current group
    const currentGroup = await prisma.roomMember.findFirst({
      where: { 
        userId: session.user.id,
        isCurrent: true 
      }
    });

    if (!currentGroup) {
      return NextResponse.json({ error: 'No active group found' }, { status: 404 });
    }

    const roomId = currentGroup.roomId;

    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch meals grouped by date for the current month
    const meals = await prisma.meal.groupBy({
      by: ['date'],
      where: {
        roomId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _count: {
        id: true
      }
    });

    // Fetch expenses grouped by date for the current month
    const expenses = await prisma.extraExpense.groupBy({
      by: ['date'],
      where: {
        roomId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Create a map of all dates in the current month
    const chartData = [];
    const currentDate = new Date(startOfMonth);

    while (currentDate <= endOfMonth) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Find meals for this date
      const dayMeals = meals.find(m => 
        m.date.toISOString().split('T')[0] === dateString
      );
      
      // Find expenses for this date
      const dayExpenses = expenses.find(e => 
        e.date.toISOString().split('T')[0] === dateString
      );

      chartData.push({
        date: dateString,
        meals: dayMeals?._count.id || 0,
        expenses: dayExpenses?._sum.amount || 0,
        balance: 0 // This could be calculated based on payments vs expenses
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error fetching dashboard chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard chart data' }, { status: 500 });
  }
} 