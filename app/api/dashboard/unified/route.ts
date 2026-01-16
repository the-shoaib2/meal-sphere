import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { cacheGetOrSet } from '@/lib/cache-service';
import { getDashboardCacheKey, CACHE_TTL } from '@/lib/cache-keys';
import { getUserBalance, getUserMealCount, calculateMealRate } from '@/lib/query-helpers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the groupId from query params
        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('groupId');

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Generate cache key
        const cacheKey = getDashboardCacheKey(session.user.id, groupId);

        // Try to get from cache or fetch fresh data
        const data = await cacheGetOrSet(
            cacheKey,
            async () => {
                // Verify membership
                const membership = await prisma.roomMember.findFirst({
                    where: {
                        userId: session.user.id,
                        roomId: groupId
                    },
                    include: { 
                        room: { 
                            select: {
                                id: true,
                                name: true,
                                memberCount: true,
                            }
                        } 
                    },
                });

                if (!membership) {
                    throw new Error('You are not a member of this group');
                }

                const roomId = groupId;
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                // Fetch ALL data in parallel using optimized helpers
                const [
                    userMealCount,
                    { mealRate, totalMeals, totalExpenses },
                    currentBalance,
                    meals,
                    payments,
                    shoppingItems,
                    expenses,
                    activities,
                    mealsByDate,
                    expensesByDate,
                ] = await Promise.all([
                    // Summary data - using cached helpers
                    getUserMealCount(session.user.id, roomId),
                    calculateMealRate(roomId),
                    getUserBalance(session.user.id, roomId),

                    // Activities data - optimized with selective fields
                    prisma.meal.findMany({
                        where: {
                            roomId,
                            date: { gte: thirtyDaysAgo }
                        },
                        select: {
                            id: true,
                            date: true,
                            type: true,
                            user: { select: { name: true, image: true } }
                        },
                        orderBy: { date: 'desc' },
                        take: 10
                    }),
                    prisma.payment.findMany({
                        where: {
                            roomId,
                            date: { gte: thirtyDaysAgo }
                        },
                        select: {
                            id: true,
                            date: true,
                            amount: true,
                            method: true,
                            status: true,
                            user: { select: { name: true, image: true } }
                        },
                        orderBy: { date: 'desc' },
                        take: 10
                    }),
                    prisma.shoppingItem.findMany({
                        where: {
                            roomId,
                            date: { gte: thirtyDaysAgo }
                        },
                        select: {
                            id: true,
                            name: true,
                            date: true,
                            purchased: true,
                            user: { select: { name: true, image: true } }
                        },
                        orderBy: { date: 'desc' },
                        take: 10
                    }),
                    prisma.extraExpense.findMany({
                        where: {
                            roomId,
                            date: { gte: thirtyDaysAgo }
                        },
                        select: {
                            id: true,
                            description: true,
                            amount: true,
                            date: true,
                            type: true,
                            user: { select: { name: true, image: true } }
                        },
                        orderBy: { date: 'desc' },
                        take: 10
                    }),
                    prisma.groupActivityLog.findMany({
                        where: {
                            roomId,
                            createdAt: { gte: thirtyDaysAgo }
                        },
                        select: {
                            id: true,
                            type: true,
                            createdAt: true,
                            user: { select: { name: true, image: true } }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }),

                    // Chart data - using aggregations
                    prisma.meal.groupBy({
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
                    }),
                    prisma.extraExpense.groupBy({
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
                    }),
                ]);

                // Calculate derived values
                const totalSpent = userMealCount * mealRate;
                const availableBalance = currentBalance - totalSpent;

                // Format summary data
                const summary = {
                    totalUserMeals: userMealCount,
                    totalAllMeals: totalMeals,
                    currentRate: mealRate,
                    currentBalance,
                    availableBalance,
                    totalCost: totalSpent,
                    activeRooms: 1,
                    totalActiveGroups: 1,
                    totalMembers: membership.room.memberCount || 0,
                    groupId,
                    groupName: membership.room.name,
                };

                // Format activities
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

                // Format chart data
                const mealsMap = new Map(mealsByDate.map(m => [m.date.toISOString().split('T')[0], m._count.id]));
                const expensesMap = new Map(expensesByDate.map(e => [e.date.toISOString().split('T')[0], e._sum.amount]));

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

                return {
                    summary,
                    activities: allActivities,
                    chartData,
                };
            },
            { ttl: CACHE_TTL.DASHBOARD }
        );

        // Return with cache headers
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error('Error fetching unified dashboard data:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
        return NextResponse.json({ error: message }, { status: error instanceof Error && error.message.includes('not a member') ? 403 : 500 });
    }
}
