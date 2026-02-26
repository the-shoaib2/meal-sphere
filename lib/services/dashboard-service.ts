
import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { 
  getGroupBalanceSummary, 
  getRoomContext
} from '@/lib/services/balance-service';
import { getCurrentPeriod } from '@/lib/utils/period-utils';
import { DashboardActivity, DashboardChartData } from '@/types/dashboard';

/**
 * Cache TTL configuration
 */
const DASHBOARD_TTL = 60;

/**
 * Helper to resolve group ID if not provided
 */
async function resolveGroupId(userId: string, groupId?: string): Promise<string | undefined> {
  if (groupId) return groupId;

  const membership = await prisma.roomMember.findFirst({
    where: { userId, isCurrent: true },
    select: { roomId: true }
  });
  
  if (membership) return membership.roomId;

  const anyMembership = await prisma.roomMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    select: { roomId: true }
  });
  
  return anyMembership?.roomId;
}

/**
 * Fetches Summary Data (Top Cards)
 */
export async function fetchDashboardSummary(userId: string, groupId?: string) {
  const resolvedGroupId = groupId || await resolveGroupId(userId);

  if (!resolvedGroupId) return null;

  const cacheKey = `dashboard:${resolvedGroupId}:${userId}`;

  const cachedFn = unstable_cache(
    async () => {
      const [activeGroupsCount, roomData, groupBalanceSummary] = await Promise.all([
        prisma.roomMember.count({ where: { userId, isBanned: false } }),
        prisma.room.findUnique({
          where: { id: resolvedGroupId },
          select: { name: true, periodMode: true }
        }),
        getGroupBalanceSummary(resolvedGroupId, true),
      ]);

      const currentPeriod = await getCurrentPeriod(resolvedGroupId);

      // EXTRACTED USER STATS logic
      const currentUserStats = groupBalanceSummary.members?.find((m: any) => m.userId === userId);
      
      const userMealCount = currentUserStats?.mealCount || 0;
      const currentBalance = currentUserStats?.balance || 0;
      const totalSpent = currentUserStats?.totalSpent || 0;
      const availableBalance = currentUserStats?.availableBalance || 0;
      const mealRate = groupBalanceSummary.mealRate || 0;

      return encryptData({
        totalUserMeals: userMealCount,
        currentRate: mealRate,
        currentBalance: currentBalance,
        availableBalance: availableBalance,
        totalCost: totalSpent,
        activeRooms: activeGroupsCount,
        totalMembers: groupBalanceSummary.members?.length || 0,
        totalAllMeals: groupBalanceSummary.totalMeals,
        totalActiveGroups: activeGroupsCount,
        groupId: resolvedGroupId,
        groupName: roomData?.name || 'Unknown Group',
        periodMode: roomData?.periodMode as 'MONTHLY' | 'CUSTOM' || 'MONTHLY',
        groupBalance: groupBalanceSummary,
        currentPeriod: currentPeriod
      });
    },
    [cacheKey],
    { revalidate: DASHBOARD_TTL, tags: [`user-${userId}`, `group-${resolvedGroupId}`, 'dashboard-summary'] }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches Activities (Recent Activity Feed)
 */
export async function fetchDashboardActivities(userId: string, groupId?: string) {
  const resolvedGroupId = groupId || await resolveGroupId(userId);
  if (!resolvedGroupId) return [];

  const cacheKey = `dashboard-activities-${resolvedGroupId}`;

  const cachedFn = unstable_cache(
    async () => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [meals, payments, expenses, shopping, activityLogs] = await Promise.all([
            prisma.meal.findMany({
              where: { roomId: resolvedGroupId, date: { gte: sevenDaysAgo } },
              select: { id: true, date: true, type: true, user: { select: { name: true, image: true } } },
              orderBy: { date: 'desc' },
              take: 10
            }),
            prisma.payment.findMany({
              where: { roomId: resolvedGroupId, date: { gte: sevenDaysAgo } },
              select: { id: true, date: true, amount: true, method: true, status: true, user: { select: { name: true, image: true } } },
              orderBy: { date: 'desc' },
              take: 10
            }),
            prisma.extraExpense.findMany({
              where: { roomId: resolvedGroupId, date: { gte: sevenDaysAgo } },
              select: { id: true, date: true, description: true, amount: true, type: true, user: { select: { name: true, image: true } } },
              orderBy: { date: 'desc' },
              take: 10
            }),
            prisma.shoppingItem.findMany({
                where: { roomId: resolvedGroupId, date: { gte: sevenDaysAgo } },
                select: { id: true, name: true, date: true, purchased: true, user: { select: { name: true, image: true } } },
                orderBy: { date: 'desc' },
                take: 10
              }),
            prisma.groupActivityLog.findMany({
                where: { roomId: resolvedGroupId, createdAt: { gte: sevenDaysAgo } },
                select: { id: true, type: true, createdAt: true, user: { select: { name: true, image: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
        ]);

        const allActivities: DashboardActivity[] = [
            ...meals.map((meal: any) => ({
              id: meal.id,
              type: 'MEAL' as const,
              title: `${meal.type.toLowerCase()} added`,
              description: `${meal.user.name} added ${meal.type.toLowerCase()}`,
              timestamp: meal.date.toISOString(),
              user: meal.user,
              icon: 'Utensils' as const
            })),
            ...payments.map((payment: any) => ({
              id: payment.id,
              type: 'PAYMENT' as const,
              title: `Payment ${payment.status.toLowerCase()}`,
              description: `${payment.user.name} made a ${payment.method.toLowerCase()} payment`,
              timestamp: payment.date.toISOString(),
              user: payment.user,
              amount: payment.amount,
              icon: 'CreditCard' as const
            })),
            ...shopping.map((item: any) => ({
              id: item.id,
              type: 'SHOPPING' as const,
              title: item.purchased ? 'Item purchased' : 'Item added to list',
              description: `${item.user.name} ${item.purchased ? 'purchased' : 'added'} ${item.name}`,
              timestamp: item.date.toISOString(),
              user: item.user,
              icon: 'ShoppingBag' as const
            })),
            ...expenses.map((expense: any) => ({
              id: expense.id,
              type: 'EXPENSE' as const,
              title: `${expense.type.toLowerCase()} expense added`,
              description: `${expense.user.name} added ${expense.description}`,
              timestamp: expense.date.toISOString(),
              user: expense.user,
              amount: expense.amount,
              icon: 'Receipt' as const
            })),
            ...activityLogs.map((activity: any) => ({
              id: activity.id,
              type: 'ACTIVITY' as const,
              title: activity.type.replace(/_/g, ' ').toLowerCase(),
              description: `${activity.user.name} performed an action`,
              timestamp: activity.createdAt.toISOString(),
              user: activity.user,
              icon: 'Users' as const
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);
        
        return encryptData(allActivities);
    },
    [cacheKey],
    { revalidate: DASHBOARD_TTL, tags: [`group-${resolvedGroupId}`, 'dashboard-activities'] }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches Chart Data
 */
export async function fetchDashboardCharts(userId: string, groupId?: string) {
    const resolvedGroupId = groupId || await resolveGroupId(userId);
    if (!resolvedGroupId) return [];
  
    const cacheKey = `dashboard-charts-${resolvedGroupId}`;
  
    const cachedFn = unstable_cache(
      async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [mealsByDate, guestMealsByDate, expensesByDate] = await Promise.all([
            prisma.meal.groupBy({
              by: ['date'],
              where: { roomId: resolvedGroupId, date: { gte: startOfMonth, lte: endOfMonth } },
              _count: { id: true }
            }),
            prisma.guestMeal.groupBy({
              by: ['date'],
              where: { roomId: resolvedGroupId, date: { gte: startOfMonth, lte: endOfMonth } },
              _sum: { count: true }
            }),
            prisma.extraExpense.groupBy({
              by: ['date'],
              where: { roomId: resolvedGroupId, date: { gte: startOfMonth, lte: endOfMonth } },
              _sum: { amount: true }
            }),
        ]);

        const mealsMap = new Map(mealsByDate.map((m: any) => [m.date.toISOString().split('T')[0], m._count.id]));
        guestMealsByDate.forEach((gm: any) => {
            const dateStr = gm.date.toISOString().split('T')[0];
            const currentCount = mealsMap.get(dateStr) || 0;
            mealsMap.set(dateStr, currentCount + (gm._sum.count || 0));
        });
        const expensesMap = new Map(expensesByDate.map((e: any) => [e.date.toISOString().split('T')[0], e._sum.amount]));
        
        const chartData: DashboardChartData[] = [];
        const currentDate = new Date(startOfMonth);
        
        // Fix: Use local date strings to match map keys
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

        return encryptData(chartData);
      },
      [cacheKey],
      { revalidate: DASHBOARD_TTL, tags: [`group-${resolvedGroupId}`, 'dashboard-charts'] }
    );
  
    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

/**
 * Fetches Monthly Expenses for the last 6 months
 */
export async function fetchMonthlyExpenses(resolvedGroupId: string) {
    const months = 6;
    const now = new Date();
    const monthlyExpenses: { name: string; value: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthName = d.toLocaleString('default', { month: 'short' });

        const expenses = await prisma.extraExpense.aggregate({
            where: { roomId: resolvedGroupId, date: { gte: start, lte: end } },
            _sum: { amount: true }
        });

        monthlyExpenses.push({
            name: monthName,
            value: Number(expenses._sum.amount || 0)
        });
    }

    return monthlyExpenses;
}

/**
 * Fetches Meal Rate Trend for the last 6 periods
 */
export async function fetchMealRateTrend(resolvedGroupId: string) {
    const periods = await prisma.mealPeriod.findMany({
        where: { roomId: resolvedGroupId, status: 'ENDED' as any }, // Assuming ENDED is the equivalent of COMPLETED in the schema
        orderBy: { startDate: 'desc' },
        take: 5,
        select: { id: true, name: true }
    });

    const trend = await Promise.all(periods.reverse().map(async (p) => {
        const summary = await getGroupBalanceSummary(resolvedGroupId, true, { periodId: p.id } as any);
        return {
            name: p.name.split(' ').pop() || p.name, // Just the month/short name
            value: summary.mealRate || 0
        };
    }));

    // Add current period if it exists and isn't completed
    const current = await getCurrentPeriod(resolvedGroupId);
    if (current && current.status !== 'ENDED') {
        const summary = await getGroupBalanceSummary(resolvedGroupId, true);
        trend.push({
            name: 'Current',
            value: summary.mealRate || 0
        });
    }

    return trend;
}

/**
 * Fetches Analytics Data
 */
export async function fetchDashboardAnalytics(userId: string, groupId?: string) {
    const resolvedGroupId = groupId || await resolveGroupId(userId);
    if (!resolvedGroupId) return {
        mealDistribution: [],
        expenseDistribution: [],
        monthlyExpenses: [],
        mealRateTrend: [],
        roomStats: []
    };
  
    const cacheKey = `dashboard-analytics:${resolvedGroupId}`;
  
    const cachedFn = unstable_cache(
      async () => {
        const currentPeriod = await getCurrentPeriod(resolvedGroupId);
        const periodId = currentPeriod?.id;

        const [mealDistributionRaw, guestMealDistributionRaw, expenseDistributionRaw, monthlyExpenses, mealRateTrend] = await Promise.all([
            prisma.meal.groupBy({
              by: ['type'],
              where: { roomId: resolvedGroupId, periodId: periodId },
              _count: { type: true }
            }),
            prisma.guestMeal.groupBy({
              by: ['type'],
              where: { roomId: resolvedGroupId, periodId: periodId },
              _sum: { count: true }
            }),
            prisma.extraExpense.groupBy({
              by: ['type'],
              where: { roomId: resolvedGroupId, periodId: periodId },
              _sum: { amount: true }
            }),
            fetchMonthlyExpenses(resolvedGroupId),
            fetchMealRateTrend(resolvedGroupId)
        ]);

        const mealMap = new Map(mealDistributionRaw.map(m => [m.type, m._count.type]));
        guestMealDistributionRaw.forEach(gm => {
            const current = mealMap.get(gm.type) || 0;
            mealMap.set(gm.type, current + (gm._sum.count || 0));
        });
        const mealDistribution = Array.from(mealMap.entries()).map(([name, value]) => ({ name, value }));
    
        const expenseDistribution = expenseDistributionRaw.map(e => ({
            name: e.type,
            value: e._sum.amount || 0
        }));

        const [summary, roomData] = await Promise.all([
            getGroupBalanceSummary(resolvedGroupId, true),
            prisma.room.findUnique({
                where: { id: resolvedGroupId },
                select: { name: true }
            })
        ]);

        // Use the summary from balance service to get aggregate stats
        const aggregateRoomStats = [{
            roomId: resolvedGroupId,
            roomName: roomData?.name || 'Unknown Room',
            totalMeals: summary.totalMeals,
            regularMealsCount: summary.totalMeals - summary.guestMealsCount,
            guestMealsCount: summary.guestMealsCount,
            totalExpenses: summary.totalExpenses,
            otherExpenses: summary.otherExpenses,
            shoppingExpenses: summary.shoppingExpenses,
            averageMealRate: summary.mealRate,
            memberCount: summary.members.length,
            activeDays: Math.max(...summary.members.map((m: any) => m.activeDays || 0), 0)
        }];

        return encryptData({
            mealDistribution,
            expenseDistribution,
            monthlyExpenses,
            mealRateTrend,
            roomStats: aggregateRoomStats
        });
      },
      [cacheKey],
      { revalidate: DASHBOARD_TTL, tags: [`group-${resolvedGroupId}`, 'dashboard-analytics'] }
    );
  
    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

/**
 * HIGH-PERFORMANCE UNIFIED FETCHER FOR DASHBOARD
 * Consolidates all dashboard data into a single cached payload.
 * Reuses RoomContext to minimize DB roundtrips.
 */
export async function fetchDashboardPageData(userId: string, groupId?: string) {
    const start = performance.now();
    const resolvedGroupId = groupId || (await resolveGroupId(userId)) || "";
    if (!resolvedGroupId) return null;

    const cacheKey = `dashboard-page-data-${userId}-${resolvedGroupId}`;

    const cachedFn = unstable_cache(
        async () => {
            // 1. Critical Path: Get Context & Summary in Parallel
            const [context, summaryRaw] = await Promise.all([
                getRoomContext(userId, resolvedGroupId),
                fetchDashboardSummary(userId, resolvedGroupId)
            ]);

            const { currentPeriod, room: roomData, member: membership } = context;
            const periodId = currentPeriod?.id;

            if (!roomData || !membership) throw new Error("Unauthorized");

            // 2. Heavy Data: Activities, Charts, Analytics in Parallel
            const [activities, chartData, analytics] = await Promise.all([
                fetchDashboardActivities(userId, resolvedGroupId),
                fetchDashboardCharts(userId, resolvedGroupId),
                // Optimized analytics: Reuse existing summary calculations
                (async () => {
                    const [mealDistributionRaw, guestMealDistributionRaw, expenseDistributionRaw] = await Promise.all([
                        prisma.meal.groupBy({
                            by: ['type'],
                            where: { roomId: resolvedGroupId, periodId },
                            _count: { type: true }
                        }),
                        prisma.guestMeal.groupBy({
                            by: ['type'],
                            where: { roomId: resolvedGroupId, periodId },
                            _sum: { count: true }
                        }),
                        prisma.extraExpense.groupBy({
                            by: ['type'],
                            where: { roomId: resolvedGroupId, periodId },
                            _sum: { amount: true }
                        })
                    ]);

                    const mealMap = new Map(mealDistributionRaw.map(m => [m.type, m._count.type]));
                    guestMealDistributionRaw.forEach(gm => {
                        const current = mealMap.get(gm.type) || 0;
                        mealMap.set(gm.type, current + (gm._sum.count || 0));
                    });

                    return {
                        mealDistribution: Array.from(mealMap.entries()).map(([name, value]) => ({ name, value })),
                        expenseDistribution: expenseDistributionRaw.map(e => ({ name: e.type, value: e._sum.amount || 0 })),
                        mealRateTrend: [{ name: 'Current', value: summaryRaw?.currentRate || 0 }],
                        monthlyExpenses: [],
                        roomStats: summaryRaw && summaryRaw.groupId ? [{
                            roomId: summaryRaw.groupId,
                            roomName: summaryRaw.groupName || 'Unknown Room',
                            totalMeals: summaryRaw.totalAllMeals || 0,
                            regularMealsCount: (summaryRaw.totalAllMeals || 0) - (summaryRaw.groupBalance?.guestMealsCount || 0),
                            guestMealsCount: summaryRaw.groupBalance?.guestMealsCount || 0,
                            totalExpenses: summaryRaw.groupBalance?.totalExpenses || 0,
                            otherExpenses: summaryRaw.groupBalance?.otherExpenses || 0,
                            shoppingExpenses: summaryRaw.groupBalance?.shoppingExpenses || 0,
                            averageMealRate: summaryRaw.currentRate || 0,
                            memberCount: summaryRaw.totalMembers || 0,
                            activeDays: 1 // Placeholder unless we want to query it specifically
                        }] : []
                    };
                })()
            ]);

            const executionTime = performance.now() - start;

            return encryptData({
                summary: summaryRaw,
                activities,
                chartData,
                analytics,
                currentPeriod,
                roomData,
                userRole: membership.role,
                timestamp: new Date().toISOString(),
                executionTime
            });
        },
        [cacheKey],
        { revalidate: DASHBOARD_TTL, tags: [`group-${resolvedGroupId}`, `user-${userId}`, 'dashboard-full'] }
    );

    return decryptData(await cachedFn());
}

/**
 * Legacy Support / Aggregator
 */
export async function fetchDashboardData(userId: string, groupId?: string) {
    return fetchDashboardPageData(userId, groupId);
}
