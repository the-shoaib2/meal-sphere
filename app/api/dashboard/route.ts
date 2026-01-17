import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
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
        let groupId = searchParams.get('groupId');
        let isDefaultGroup = false;

        if (!groupId) {
             // If no groupId provided, try to find the user's current active group
             const currentGroup = await prisma.roomMember.findFirst({
                 where: { 
                     userId: session.user.id,
                     isCurrent: true 
                 },
                 select: { roomId: true }
             });

             if (currentGroup) {
                 groupId = currentGroup.roomId;
                 isDefaultGroup = true;
             } else {
                 // Fallback to most recently joined group
                 const latestGroup = await prisma.roomMember.findFirst({
                     where: { userId: session.user.id },
                     orderBy: { joinedAt: 'desc' },
                     select: { roomId: true }
                 });

                 if (latestGroup) {
                     groupId = latestGroup.roomId;
                     isDefaultGroup = true;
                 }
             }
        }

        if (!groupId) {
            return NextResponse.json({ error: 'No groups found for user' }, { status: 404 });
        }

        // Generate cache key
        const cacheKey = `dashboard:main:${session.user.id}:${groupId}:v1`;
        const startTime = Date.now();
        const data = await cacheGetOrSet(
            cacheKey,
            async () => {
                // 1. Initial configuration fetch (Mandatory for next steps)
                const [membership, activePeriod] = await Promise.all([
                    prisma.roomMember.findFirst({
                        where: { userId: session.user.id, roomId: groupId! },
                        select: { 
                            role: true,
                            room: { select: { id: true, name: true, memberCount: true } } 
                        },
                    }),
                    prisma.mealPeriod.findFirst({
                        where: { roomId: groupId!, status: 'ACTIVE' },
                        select: { id: true, roomId: true, startDate: true, endDate: true }
                    })
                ]);

                if (!membership) {
                    throw new Error('You are not a member of this group');
                }

                const roomId = groupId!;
                const periodId = activePeriod?.id;
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const activePeriodIds = activePeriod ? [activePeriod.id] : [];

                // --- ONE BIG PARALLEL FETCH ---
                const [
                    userMealCount,
                    totalMealsResults,
                    totalExpensesResults,
                    currentBalanceResult,
                    recentActivitiesData,
                    mealsByDate,
                    expensesByDate,
                    userRoomMemberships,
                    mealDistributionData,
                    expenseDistributionData,
                    periodStats,
                    shoppingQuantity,
                    groupBalance
                ] = await Promise.all([
                    // Summary counts (Raw DB calls bypass Upstash overhead)
                    prisma.meal.count({ where: { userId: session.user.id, roomId, periodId } }),
                    prisma.meal.count({ where: { roomId, periodId } }),
                    prisma.extraExpense.aggregate({ 
                        where: { roomId, periodId }, 
                        _sum: { amount: true } 
                    }),
                    prisma.accountTransaction.aggregate({ 
                        where: { roomId, targetUserId: session.user.id, periodId }, 
                        _sum: { amount: true } 
                    }),
                    
                    // Activities (Raw DB calls)
                    Promise.all([
                        prisma.meal.findMany({
                            where: { roomId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                            select: { id: true, date: true, type: true, user: { select: { name: true, image: true } } },
                            orderBy: { date: 'desc' }, take: 5
                        }),
                        prisma.payment.findMany({
                            where: { roomId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                            select: { id: true, date: true, amount: true, method: true, status: true, user: { select: { name: true, image: true } } },
                            orderBy: { date: 'desc' }, take: 5
                        }),
                        prisma.extraExpense.findMany({
                            where: { roomId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                            select: { id: true, date: true, description: true, amount: true, type: true, user: { select: { name: true, image: true } } },
                            orderBy: { date: 'desc' }, take: 5
                        }),
                        prisma.shoppingItem.findMany({
                            where: { roomId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                            select: { id: true, name: true, date: true, purchased: true, user: { select: { name: true, image: true } } },
                            orderBy: { date: 'desc' }, take: 5
                        }),
                        prisma.groupActivityLog.findMany({
                            where: { roomId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                            select: { id: true, type: true, createdAt: true, user: { select: { name: true, image: true } } },
                            orderBy: { createdAt: 'desc' }, take: 5
                        })
                    ]),

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
                    prisma.roomMember.findMany({ 
                        where: { userId: session.user.id }, 
                        select: { roomId: true, room: { select: { id: true, name: true, memberCount: true } } } 
                    }),
                    
                    periodId ? prisma.meal.groupBy({ by: ['type'], where: { periodId }, _count: { id: true } }) : Promise.resolve([]),
                    periodId ? prisma.extraExpense.groupBy({ by: ['type'], where: { periodId }, _sum: { amount: true } }) : Promise.resolve([]),
                    periodId ? prisma.meal.groupBy({ by: ['periodId'], where: { periodId }, _count: { id: true } }) : Promise.resolve([]),
                    periodId ? prisma.shoppingItem.aggregate({ where: { periodId }, _sum: { quantity: true } }) : Promise.resolve({ _sum: { quantity: 0 } }),
                    
                    hasBalancePrivilege(membership.role) 
                        ? getGroupBalanceSummary(roomId, true) 
                        : Promise.resolve(null)
                ]);

                // --- DATA PROCESSING (Synchronous only) ---

                // 1. Process User Rooms (Using denormalized counts)
                const userRooms = userRoomMemberships.map(m => ({
                    id: m.roomId, name: m.room.name, memberCount: m.room.memberCount || 0
                }));

                // 2. Process Detailed Analytics
                const totalExpenses = totalExpensesResults._sum.amount || 0;
                const totalAllMeals = totalMealsResults || 0;
                const mealRate = totalAllMeals > 0 ? totalExpenses / totalAllMeals : 0;
                const currentBalance = currentBalanceResult._sum.amount || 0;
                const [m1, p1, e1, s1, a1] = recentActivitiesData;
                
                const analytics = {
                    roomStats: [{
                        roomId, roomName: membership.room.name,
                        totalMeals: periodStats.reduce((acc, curr) => acc + (curr._count.id || 0), 0),
                        totalExpenses, averageMealRate: mealRate, memberCount: membership.room.memberCount || 0,
                        activeDays: activePeriod ? Math.ceil(Math.abs(new Date(activePeriod.endDate || now).getTime() - new Date(activePeriod.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1 : 1
                    }],
                    mealDistribution: mealDistributionData.map(item => ({ name: item.type.charAt(0) + item.type.slice(1).toLowerCase(), value: item._count.id })),
                    expenseDistribution: expenseDistributionData.map(item => ({ name: item.type.charAt(0) + item.type.slice(1).toLowerCase(), value: item._sum.amount || 0 })),
                    mealRateTrend: [], monthlyExpenses: [] as { name: string; value: number }[],
                };
                
                // Add monthly expenses from chart data
                const monthlyExpensesMap = new Map<string, number>();
                expensesByDate.forEach((e: any) => {
                   const d = new Date(e.date);
                   const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
                   monthlyExpensesMap.set(key, (monthlyExpensesMap.get(key) || 0) + (e._sum.amount || 0));
                });
                analytics.monthlyExpenses = Array.from(monthlyExpensesMap.entries()).map(([name, value]) => ({ name, value }));

                // 3. Process Summary Data
                const totalSpent = userMealCount * mealRate;
                const summary = {
                    totalUserMeals: userMealCount, totalAllMeals, currentRate: mealRate, currentBalance,
                    availableBalance: currentBalance - totalSpent, totalCost: totalSpent,
                    activeRooms: userRooms.length, totalActiveGroups: userRooms.length,
                    totalMembers: membership.room.memberCount || 0, groupId, groupName: membership.room.name,
                };

                // 4. Process Activities
                const allActivities = [
                    ...m1.map((meal: any) => ({
                        id: meal.id, type: 'MEAL' as const, title: `${meal.type.toLocaleLowerCase()} added`,
                        description: `${meal.user.name} added ${meal.type.toLocaleLowerCase()}`,
                        timestamp: meal.date.toISOString(), user: meal.user, icon: 'Utensils'
                    })),
                    ...p1.map((payment: any) => ({
                        id: payment.id, type: 'PAYMENT' as const, title: `Payment ${payment.status.toLowerCase()}`,
                        description: `${payment.user.name} made a ${payment.method.toLowerCase()} payment`,
                        timestamp: payment.date.toISOString(), user: payment.user, amount: payment.amount, icon: 'CreditCard'
                    })),
                    ...s1.map((item: any) => ({
                        id: item.id, type: 'SHOPPING' as const, title: item.purchased ? 'Item purchased' : 'Item added to list',
                        description: `${item.user.name} ${item.purchased ? 'purchased' : 'added'} ${item.name}`,
                        timestamp: item.date.toISOString(), user: item.user, icon: 'ShoppingBag'
                    })),
                    ...e1.map((expense: any) => ({
                        id: expense.id, type: 'EXPENSE' as const, title: `${expense.type.toLowerCase()} expense added`,
                        description: `${expense.user.name} added ${expense.description}`,
                        timestamp: expense.date.toISOString(), user: expense.user, amount: expense.amount, icon: 'Receipt'
                    })),
                    ...a1.map((activity: any) => ({
                        id: activity.id, type: 'ACTIVITY' as const, title: activity.type.replace(/_/g, ' ').toLowerCase(),
                        description: `${activity.user.name} performed an action`,
                        timestamp: activity.createdAt.toISOString(), user: activity.user, icon: 'Users'
                    }))
                ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

                // 5. Process Chart Data
                const mealsMap = new Map(mealsByDate.map((m: any) => [m.date.toISOString().split('T')[0], m._count.id]));
                const expensesMap = new Map(expensesByDate.map((e: any) => [e.date.toISOString().split('T')[0], e._sum.amount]));
                const chartData = [];
                const currentDate = new Date(startOfMonth);
                while (currentDate <= endOfMonth) {
                    const dateString = currentDate.toISOString().split('T')[0];
                    chartData.push({
                        date: dateString, meals: mealsMap.get(dateString) || 0, expenses: expensesMap.get(dateString) || 0, balance: 0
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                return {
                    summary, activities: allActivities, chartData, analytics, userRooms, groupBalance
                    // Note: groups and notifications removed as they are redundant
                };
            },
            { ttl: CACHE_TTL.DASHBOARD }
        );


        const duration = Date.now() - startTime;
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store',
                'Server-Timing': `total;dur=${duration}`
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
        return NextResponse.json({ error: message }, { status: error instanceof Error && error.message.includes('not a member') ? 403 : 500 });
    }
}
