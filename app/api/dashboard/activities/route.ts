import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { getRecentActivitiesOptimized } from '@/lib/utils/query-helpers';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get groupId from query params
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    // Fallback to current group if no groupId provided
    let roomId = groupId;
    
    if (!roomId) {
      const currentGroup = await prisma.roomMember.findFirst({
        where: {
          userId: session.user.id,
          isCurrent: true
        },
        select: { roomId: true }
      });

      if (!currentGroup) {
        return NextResponse.json({ error: 'No active group found' }, { status: 404 });
      }
      roomId = currentGroup.roomId;
    }

    // Cache key based on roomId and 7 days
    const cacheKey = `activities:${roomId}:7days`;

    const allActivities = await cacheGetOrSet(
      cacheKey,
      async () => {
        // Use optimized helper (7 days instead of 30)
        const recentActivities = await getRecentActivitiesOptimized(roomId!, 7, 10);

        // Format activities
        return [
          ...recentActivities.meals.map((meal: any) => ({
            id: meal.id,
            type: 'MEAL' as const,
            title: `${meal.type.toLowerCase()} added`,
            description: `${meal.user.name} added ${meal.type.toLowerCase()}`,
            timestamp: meal.date.toISOString(),
            user: meal.user,
            amount: undefined,
            icon: 'Utensils'
          })),
          ...recentActivities.payments.map((payment: any) => ({
            id: payment.id,
            type: 'PAYMENT' as const,
            title: `Payment ${payment.status.toLowerCase()}`,
            description: `${payment.user.name} made a ${payment.method.toLowerCase()} payment`,
            timestamp: payment.date.toISOString(),
            user: payment.user,
            amount: payment.amount,
            icon: 'CreditCard'
          })),
          ...recentActivities.shopping.map((item: any) => ({
            id: item.id,
            type: 'SHOPPING' as const,
            title: item.purchased ? 'Item purchased' : 'Item added to list',
            description: `${item.user.name} ${item.purchased ? 'purchased' : 'added'} ${item.name}`,
            timestamp: item.date.toISOString(),
            user: item.user,
            amount: undefined,
            icon: 'ShoppingBag'
          })),
          ...recentActivities.expenses.map((expense: any) => ({
            id: expense.id,
            type: 'EXPENSE' as const,
            title: `${expense.type.toLowerCase()} expense added`,
            description: `${expense.user.name} added ${expense.description}`,
            timestamp: expense.date.toISOString(),
            user: expense.user,
            amount: expense.amount,
            icon: 'Receipt'
          })),
          ...recentActivities.activities.map((activity: any) => ({
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
      },
      { ttl: CACHE_TTL.DASHBOARD }
    );

    return NextResponse.json(allActivities);
  } catch (error) {
    console.error('Error fetching dashboard activities:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard activities' }, { status: 500 });
  }
} 
