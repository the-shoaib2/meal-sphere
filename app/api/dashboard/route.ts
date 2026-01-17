import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { getDashboardCacheKey, CACHE_TTL } from '@/lib/cache/cache-keys';
import { getUserBalance, getUserMealCount, calculateMealRate, getRecentActivitiesOptimized } from '@/lib/utils/query-helpers';
import { getUserGroups } from '@/lib/group-query-helpers';
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from '@/lib/utils/chart-utils';
import { NotificationType } from '@prisma/client';
import { getGroupBalanceSummary } from '@/lib/services/balance-service';
import { hasBalancePrivilege } from '@/lib/auth/balance-permissions';

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
        const cacheKey = `dashboard:main:${session.user.id}:${groupId}:v1`;

        // Try to get from cache or fetch fresh data
        const data = await cacheGetOrSet(
            cacheKey,
            async () => {
                // 1. Verify membership for the requested group
                const membership = await prisma.roomMember.findFirst({
                    where: { userId: session.user.id, roomId: groupId },
                    select: { 
                        role: true,
                        room: { select: { id: true, name: true, memberCount: true } } 
                    },
                });

                if (!membership) {
                    throw new Error('You are not a member of this group');
                }

                // Prepare dates
                const roomId = groupId;
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                // --- PARALLEL DATA FETCHING ---
                const [
                    // A. Dashboard Summary Data
                    userMealCount,
                    { mealRate, totalMeals, totalExpenses },
                    currentBalance,
                    recentActivities,
                    mealsByDate,
                    expensesByDate,
                    
                    // B. User Rooms (for selector) & Groups (for sidebar)
                    userRoomMemberships,
                    userGroups,

                    // C. Notifications
                    notifications,

                    // D. Detailed Analytics Data (Active Periods & Related Data)
                    activePeriods,

                    // E. Group Balance Summary (Conditional)
                    groupBalance
                ] = await Promise.all([
                    // A. Summary Data
                    getUserMealCount(session.user.id, roomId),
                    calculateMealRate(roomId),
                    getUserBalance(session.user.id, roomId),
                    getRecentActivitiesOptimized(roomId, 7, 10),
                    prisma.meal.groupBy({
                        by: ['date'],
                        where: { roomId, date: { gte: startOfMonth, lte: endOfMonth } },
                        _count: { id: true }
                    }),
                    prisma.extraExpense.groupBy({
                        by: ['date'],
                        where: { roomId, date: { gte: startOfMonth, lte: endOfMonth } },
                        _sum: { amount: true }
                    }),

                    // B. User Rooms & Groups
                    prisma.roomMember.findMany({ where: { userId: session.user.id }, select: { roomId: true } }),
                    getUserGroups(session.user.id, false),

                    // C. Notifications
                    prisma.notification.findMany({
                        where: {
                            userId: session.user.id,
                            type: { in: Object.values(NotificationType) as NotificationType[] }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 20,
                        select: { id: true, type: true, message: true, read: true, createdAt: true, userId: true }
                    }),

                    // D. Detailed Analytics - Fetch Active Periods
                    prisma.mealPeriod.findMany({
                        where: { roomId, status: 'ACTIVE' },
                        select: { id: true, roomId: true, startDate: true, endDate: true }
                    }),

                    // E. Group Balance Summary
                    hasBalancePrivilege(membership.role) 
                        ? getGroupBalanceSummary(groupId, true) 
                        : Promise.resolve(null)
                ]);

                // --- DATA PROCESSING ---

                // 1. Process User Rooms
                const userRoomIds = userRoomMemberships.map(m => m.roomId);
                const validRooms = await prisma.room.findMany({
                    where: { id: { in: userRoomIds } },
                    select: { id: true, name: true }
                });
                const roomMemberCounts = await prisma.roomMember.groupBy({
                    by: ['roomId'],
                    where: { roomId: { in: userRoomIds } },
                    _count: { userId: true }
                });
                const memberCountMap = roomMemberCounts.reduce((acc, curr) => ({ ...acc, [curr.roomId]: curr._count.userId }), {} as Record<string, number>);
                
                const userRooms = validRooms.map(room => ({
                    id: room.id,
                    name: room.name,
                    memberCount: memberCountMap[room.id] || 0
                }));

                // 2. Process Detailed Analytics (Optimized for current room only to keep it fast)
                // We reuse the active period for the CURRENT room if available
                const activePeriodIds = activePeriods.map(p => p.id);
                
                // Fetch analytics details ONLY if there are active periods (or fall back to empty)
                const [analyticsMeals, analyticsExpenses, analyticsShopping] = activePeriodIds.length > 0 ? await Promise.all([
                    prisma.meal.findMany({
                        where: { periodId: { in: activePeriodIds } },
                        include: { room: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
                        orderBy: { date: 'desc' }
                    }),
                    prisma.extraExpense.findMany({
                        where: { periodId: { in: activePeriodIds } },
                        include: { room: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
                        orderBy: { date: 'desc' }
                    }),
                    prisma.shoppingItem.findMany({
                        where: { periodId: { in: activePeriodIds } },
                        include: { room: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
                        orderBy: { date: 'desc' }
                    })
                ]) : [[], [], []];

                // Generate Analytics Stats
                const analyticsCalculations = [{
                    id: roomId,
                    roomId,
                    roomName: membership.room.name,
                    startDate: activePeriods[0]?.startDate?.toISOString() || new Date().toISOString(),
                    endDate: activePeriods[0]?.endDate?.toISOString() || new Date().toISOString(),
                    totalMeals: analyticsMeals.length,
                    totalExpense: analyticsExpenses.reduce((sum, e) => sum + e.amount, 0) + analyticsShopping.reduce((sum, s) => sum + (s.quantity || 0), 0),
                    mealRate: 0, // calculated below
                    memberCount: membership.room.memberCount || 0,
                }];
                
                if (analyticsCalculations[0].totalMeals > 0) {
                    analyticsCalculations[0].mealRate = analyticsCalculations[0].totalExpense / analyticsCalculations[0].totalMeals;
                }

                const roomStats = analyticsCalculations.map(calc => {
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

                const analytics = {
                    roomStats,
                    mealDistribution: generateMealCountData(analyticsMeals),
                    expenseDistribution: generateExpenseData(analyticsExpenses, analyticsShopping),
                    mealRateTrend: generateMealRateTrendData(analyticsCalculations),
                    monthlyExpenses: generateMonthlyExpenseData(analyticsExpenses, analyticsShopping),
                };

                // 3. Process Summary Data
                const totalSpent = userMealCount * mealRate;
                const availableBalance = currentBalance - totalSpent;
                
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

                // 4. Process Activities
                const allActivities = [
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

                // 5. Process Chart Data
                const mealsMap = new Map(mealsByDate.map((m: any) => [m.date.toISOString().split('T')[0], m._count.id]));
                const expensesMap = new Map(expensesByDate.map((e: any) => [e.date.toISOString().split('T')[0], e._sum.amount]));
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

                // Final Combined Response
                return {
                    summary,
                    activities: allActivities,
                    chartData,
                    analytics,
                    userRooms,
                    groups: userGroups,
                    groupBalance,
                    notifications: notifications.map(n => ({
                        ...n,
                        createdAt: n.createdAt.toISOString()
                    }))
                };
            },
            { ttl: CACHE_TTL.DASHBOARD }
        );

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
        return NextResponse.json({ error: message }, { status: error instanceof Error && error.message.includes('not a member') ? 403 : 500 });
    }
}
