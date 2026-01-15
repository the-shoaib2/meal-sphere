import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

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
    // Create key-value maps for O(1) lookup
    const mealsMap = new Map(meals.map(m => [m.date.toISOString().split('T')[0], m._count.id]));
    const expensesMap = new Map(expenses.map(e => [e.date.toISOString().split('T')[0], e._sum.amount]));

    const chartData = [];
    const currentDate = new Date(startOfMonth);

    while (currentDate <= endOfMonth) {
      const dateString = currentDate.toISOString().split('T')[0];

      chartData.push({
        date: dateString,
        meals: mealsMap.get(dateString) || 0,
        expenses: expensesMap.get(dateString) || 0,
        balance: 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(chartData, {
      headers: {
        'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard chart data' }, { status: 500 });
  }
} 
