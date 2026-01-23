import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { 
  getGroupBalanceSummary, 
  calculateAvailableBalance,
  calculateUserMealCount,
  calculateBalance,
} from '@/lib/services/balance-service';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

/**
 * Fetches all dashboard data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchDashboardData(userId: string, groupId?: string) {
  // Resolve group membership if groupId not provided
  let resolvedGroupId = groupId;
  
  if (!resolvedGroupId) {
    const membership = await prisma.roomMember.findFirst({
      where: { userId, isCurrent: true },
      select: { roomId: true }
    });
    
    if (!membership) {
      const anyMembership = await prisma.roomMember.findFirst({
        where: { userId },
        orderBy: { joinedAt: 'desc' },
        select: { roomId: true }
      });
      resolvedGroupId = anyMembership?.roomId;
    } else {
      resolvedGroupId = membership.roomId;
    }
  }

  // If still no group, return empty data
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

  const cacheKey = `dashboard-data-${userId}-${resolvedGroupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Calculate date ranges
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const currentPeriod = await getCurrentPeriod(resolvedGroupId!);
      const periodId = currentPeriod?.id;

      // Split parallel queries into batches to avoid "MaxClientsInSessionMode" error
      // 1. Core Group Info
      const [activeGroupsCount, roomData, groupBalanceSummary] = await Promise.all([
        prisma.roomMember.count({ where: { userId, isBanned: false } }),
        prisma.room.findUnique({
          where: { id: resolvedGroupId },
          select: { name: true }
        }),
        getGroupBalanceSummary(resolvedGroupId!, true),
      ]);

      // 2. Activities (Batch 1)
      const [meals, payments, expenses] = await Promise.all([
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
      ]);

      // 3. Activities (Batch 2) + Charts
      const [shopping, activityLogs, mealsByDate, expensesByDate] = await Promise.all([
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

      // 4. Analytics Data
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

      // Calculate user stats from group summary
      // Find current user in the members list
      const currentUserStats = groupBalanceSummary.members?.find((m: any) => m.userId === userId);
      
      const userMealCount = currentUserStats?.mealCount || 0;
      const currentBalance = currentUserStats?.balance || 0;
      const totalSpent = currentUserStats?.totalSpent || 0;
      const availableBalance = currentUserStats?.availableBalance || 0;
      const mealRate = groupBalanceSummary.mealRate || 0;
      
      const userRole = currentUserStats?.role || null;
      const isBanned = currentUserStats?.isBanned || false;

      // Build activities array (matching activities route)
      const allActivities = [
        ...meals.map((meal: any) => ({
          id: meal.id,
          type: 'MEAL' as const,
          title: `${meal.type.toLowerCase()} added`,
          description: `${meal.user.name} added ${meal.type.toLowerCase()}`,
          timestamp: meal.date.toISOString(),
          user: meal.user,
          icon: 'Utensils'
        })),
        ...payments.map((payment: any) => ({
          id: payment.id,
          type: 'PAYMENT' as const,
          title: `Payment ${payment.status.toLowerCase()}`,
          description: `${payment.user.name} made a ${payment.method.toLowerCase()} payment`,
          timestamp: payment.date.toISOString(),
          user: payment.user,
          amount: payment.amount,
          icon: 'CreditCard'
        })),
        ...shopping.map((item: any) => ({
          id: item.id,
          type: 'SHOPPING' as const,
          title: item.purchased ? 'Item purchased' : 'Item added to list',
          description: `${item.user.name} ${item.purchased ? 'purchased' : 'added'} ${item.name}`,
          timestamp: item.date.toISOString(),
          user: item.user,
          icon: 'ShoppingBag'
        })),
        ...expenses.map((expense: any) => ({
          id: expense.id,
          type: 'EXPENSE' as const,
          title: `${expense.type.toLowerCase()} expense added`,
          description: `${expense.user.name} added ${expense.description}`,
          timestamp: expense.date.toISOString(),
          user: expense.user,
          amount: expense.amount,
          icon: 'Receipt'
        })),
        ...activityLogs.map((activity: any) => ({
          id: activity.id,
          type: 'ACTIVITY' as const,
          title: activity.type.replace(/_/g, ' ').toLowerCase(),
          description: `${activity.user.name} performed an action`,
          timestamp: activity.createdAt.toISOString(),
          user: activity.user,
          icon: 'Users'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);

      // Build chart data (matching charts route)
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

      // Transform analytics data
      const mealDistribution = mealDistributionRaw.map(m => ({
        name: m.type,
        value: m._count.type
      }));

      const expenseDistribution = expenseDistributionRaw.map(e => ({
        name: e.type,
        value: e._sum.amount || 0
      }));

      const mealRateTrend = [{ name: 'Current', value: mealRate }];

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        summary: {
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
          groupBalance: groupBalanceSummary,
          currentPeriod: currentPeriod
        },
        activities: allActivities,
        chartData,
        analytics: {
          mealDistribution,
          expenseDistribution,
          monthlyExpenses: [],
          mealRateTrend,
          roomStats: []
        },
        groupBalance: groupBalanceSummary,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'dashboard'],
    { revalidate: 60, tags: [`user-${userId}`, `group-${resolvedGroupId}`, 'dashboard'] }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
