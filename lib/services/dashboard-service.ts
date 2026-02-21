
import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { 
  getGroupBalanceSummary, 
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
  const resolvedGroupId = await resolveGroupId(userId, groupId);

  if (!resolvedGroupId) return null;

  const cacheKey = `dashboard-summary-${userId}-${resolvedGroupId}`;

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
  const resolvedGroupId = await resolveGroupId(userId, groupId);
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
    const resolvedGroupId = await resolveGroupId(userId, groupId);
    if (!resolvedGroupId) return [];
  
    const cacheKey = `dashboard-charts-${resolvedGroupId}`;
  
    const cachedFn = unstable_cache(
      async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [mealsByDate, expensesByDate] = await Promise.all([
            prisma.meal.groupBy({
              by: ['date'],
              where: { roomId: resolvedGroupId, date: { gte: startOfMonth, lte: endOfMonth } },
              _count: { id: true }
            }),
            prisma.extraExpense.groupBy({
              by: ['date'],
              where: { roomId: resolvedGroupId, date: { gte: startOfMonth, lte: endOfMonth } },
              _sum: { amount: true }
            }),
        ]);

        const mealsMap = new Map(mealsByDate.map((m: any) => [m.date.toISOString().split('T')[0], m._count.id]));
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
 * Fetches Analytics Data
 */
export async function fetchDashboardAnalytics(userId: string, groupId?: string) {
    const resolvedGroupId = await resolveGroupId(userId, groupId);
    if (!resolvedGroupId) return {
        mealDistribution: [],
        expenseDistribution: [],
        monthlyExpenses: [],
        mealRateTrend: [],
        roomStats: []
    };
  
    const cacheKey = `dashboard-analytics-${resolvedGroupId}`;
  
    const cachedFn = unstable_cache(
      async () => {
        const currentPeriod = await getCurrentPeriod(resolvedGroupId);
        const periodId = currentPeriod?.id;

        const [mealDistributionRaw, expenseDistributionRaw] = await Promise.all([
            prisma.meal.groupBy({
              by: ['type'],
              where: { roomId: resolvedGroupId, periodId: periodId },
              _count: { type: true }
            }),
            prisma.extraExpense.groupBy({
              by: ['type'],
              where: { roomId: resolvedGroupId, periodId: periodId },
              _sum: { amount: true }
            })
        ]);

        const mealDistribution = mealDistributionRaw.map(m => ({
            name: m.type,
            value: m._count.type
        }));
    
        const expenseDistribution = expenseDistributionRaw.map(e => ({
            name: e.type,
            value: e._sum.amount || 0
        }));

        // We can add meal rate trend here if we want to fetch historical periods
        // For now, keeping it basic as per original
        const summary = await getGroupBalanceSummary(resolvedGroupId, true);
        const mealRateTrend = [{ name: 'Current', value: summary.mealRate || 0 }];

        return encryptData({
            mealDistribution,
            expenseDistribution,
            monthlyExpenses: [], // Placeholder if needed
            mealRateTrend,
            roomStats: []
        });
      },
      [cacheKey],
      { revalidate: DASHBOARD_TTL, tags: [`group-${resolvedGroupId}`, 'dashboard-analytics'] }
    );
  
    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

/**
 * Legacy Support / Aggregator
 */
export async function fetchDashboardData(userId: string, groupId?: string) {
    const start = performance.now();
    const resolvedGroupId = await resolveGroupId(userId, groupId);
    
    if (!resolvedGroupId) {
        return {
          summary: null,
          activities: [],
          chartData: [],
          analytics: {
            mealDistribution: [],
            expenseDistribution: [],
            monthlyExpenses: [],
            mealRateTrend: [],
            roomStats: []
          },
          groupBalance: null,
          timestamp: new Date().toISOString(),
          executionTime: 0
        };
    }

    const [summary, activities, chartData, analytics] = await Promise.all([
        fetchDashboardSummary(userId, resolvedGroupId),
        fetchDashboardActivities(userId, resolvedGroupId),
        fetchDashboardCharts(userId, resolvedGroupId),
        fetchDashboardAnalytics(userId, resolvedGroupId)
    ]);

    const end = performance.now();
    
    return {
        summary,
        activities,
        chartData,
        analytics,
        groupBalance: summary?.groupBalance, // Included in summary now
        timestamp: new Date().toISOString(),
        executionTime: end - start
    };
}
