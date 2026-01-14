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
      },
      include: { room: true }
    });

    if (!currentGroup) {
      return NextResponse.json({ error: 'No active group found' }, { status: 404 });
    }

    const roomId = currentGroup.roomId;

    // Fetch recent activities from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch meals
    const meals = await prisma.meal.findMany({
      where: {
        roomId,
        date: { gte: thirtyDaysAgo }
      },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    // Fetch payments
    const payments = await prisma.payment.findMany({
      where: {
        roomId,
        date: { gte: thirtyDaysAgo }
      },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    // Fetch shopping items
    const shoppingItems = await prisma.shoppingItem.findMany({
      where: {
        roomId,
        date: { gte: thirtyDaysAgo }
      },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    // Fetch extra expenses
    const expenses = await prisma.extraExpense.findMany({
      where: {
        roomId,
        date: { gte: thirtyDaysAgo }
      },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    // Fetch group activities
    const activities = await prisma.groupActivityLog.findMany({
      where: {
        roomId,
        createdAt: { gte: thirtyDaysAgo }
      },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Combine and format all activities
    const allActivities = [
      ...meals.map(meal => ({
        id: meal.id,
        type: 'MEAL' as const,
        title: `${meal.type.toLowerCase()} added`,
        description: `${meal.user.name} added ${meal.type.toLowerCase()}`,
        timestamp: meal.date.toISOString(),
        user: meal.user,
        amount: undefined,
        icon: 'Utensils'
      })),
      ...payments.map(payment => ({
        id: payment.id,
        type: 'PAYMENT' as const,
        title: `Payment ${payment.status.toLowerCase()}`,
        description: `${payment.user.name} made a ${payment.method.toLowerCase()} payment`,
        timestamp: payment.date.toISOString(),
        user: payment.user,
        amount: payment.amount,
        icon: 'CreditCard'
      })),
      ...shoppingItems.map(item => ({
        id: item.id,
        type: 'SHOPPING' as const,
        title: item.purchased ? 'Item purchased' : 'Item added to list',
        description: `${item.user.name} ${item.purchased ? 'purchased' : 'added'} ${item.name}`,
        timestamp: item.date.toISOString(),
        user: item.user,
        amount: undefined,
        icon: 'ShoppingBag'
      })),
      ...expenses.map(expense => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        title: `${expense.type.toLowerCase()} expense added`,
        description: `${expense.user.name} added ${expense.description}`,
        timestamp: expense.date.toISOString(),
        user: expense.user,
        amount: expense.amount,
        icon: 'Receipt'
      })),
      ...activities.map(activity => ({
        id: activity.id,
        type: 'ACTIVITY' as const,
        title: activity.type.replace(/_/g, ' ').toLowerCase(),
        description: `${activity.user.name} performed an action`,
        timestamp: activity.createdAt.toISOString(),
        user: activity.user,
        amount: undefined,
        icon: 'Users'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

    return NextResponse.json(allActivities);
  } catch (error) {
    console.error('Error fetching dashboard activities:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard activities' }, { status: 500 });
  }
} 
