import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { 
  getGroupBalanceSummary, 
  calculateAvailableBalance,
} from '@/lib/services/balance-service';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

export async function fetchDashboardData(userId: string, groupId: string) {
  const cacheKey = `dashboard-v2-data-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
     async () => {
        const start = performance.now();
        
        const currentPeriod = await getCurrentPeriod(groupId);
        const periodId = currentPeriod?.id;

        const [
            room,
            groupSummary,
            activitiesRaw,
            mealsRaw,
            expensesRaw,
            userBalanceInfo,
            mealDistributionRaw,
            expenseDistributionRaw,
            monthlyExpensesRaw
        ] = await Promise.all([
            prisma.room.findUnique({ select: { id: true, name: true, memberCount: true }, where: { id: groupId } }),
            getGroupBalanceSummary(groupId, false),
            prisma.transactionHistory.findMany({
                where: { roomId: groupId },
                orderBy: { changedAt: 'desc' },
                take: 10,
                include: { changedByUser: { select: { name: true, image: true } } }
            }),
            prisma.meal.findMany({
              where: { roomId: groupId },
              orderBy: { date: 'asc' },
              take: 1000
            }),
            prisma.extraExpense.findMany({
               where: { roomId: groupId },
               orderBy: { date: 'asc' },
               take: 1000
            }),
            calculateAvailableBalance(userId, groupId, periodId),
            prisma.meal.groupBy({
                by: ['type'],
                where: { roomId: groupId, periodId: periodId },
                _count: { type: true }
            }),
            prisma.extraExpense.groupBy({
                by: ['type'],
                where: { roomId: groupId, periodId: periodId },
                _sum: { amount: true }
            }),
             prisma.extraExpense.findMany({
                where: { 
                    roomId: groupId,
                    date: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
                },
                select: { date: true, amount: true }
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

        const monthlyExpensesMap = new Map<string, number>();
        monthlyExpensesRaw.forEach(e => {
            const month = e.date.toLocaleString('default', { month: 'short' });
            const current = monthlyExpensesMap.get(month) || 0;
            monthlyExpensesMap.set(month, current + e.amount);
        });
        const monthlyExpenses = Array.from(monthlyExpensesMap.entries()).map(([name, value]) => ({ name, value }));
        
        const mealRateTrend = [{ name: 'Current', value: groupSummary.mealRate }];

        const activities = activitiesRaw.map(a => ({
          id: a.id,
          type: a.type as any,
          title: a.action === 'CREATE' ? `New ${a.type.toLowerCase()}` : `${a.action} ${a.type}`,
          description: a.description || 'No description',
          timestamp: a.changedAt.toISOString(),
          amount: a.amount,
          user: a.changedByUser
        }));

        const chartDataMap = new Map<string, { date: string, meals: number, expenses: number, balance: 0 }>();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        for (let i = 0; i < 30; i++) {
           const d = new Date(now);
           d.setDate(d.getDate() - i);
           const key = d.toISOString().split('T')[0];
           chartDataMap.set(key, { date: key, meals: 0, expenses: 0, balance: 0 });
        }
        
        mealsRaw.filter(m => m.date >= thirtyDaysAgo).forEach(m => {
           const key = m.date.toISOString().split('T')[0];
           if (chartDataMap.has(key)) {
              chartDataMap.get(key)!.meals += 1;
           }
        });
        
         expensesRaw.filter(e => e.date >= thirtyDaysAgo).forEach(e => {
           const key = e.date.toISOString().split('T')[0];
           if (chartDataMap.has(key)) {
              chartDataMap.get(key)!.expenses += e.amount;
           }
        });
        
        const chartData = Array.from(chartDataMap.values()).sort((a,b) => a.date.localeCompare(b.date));

        const end = performance.now();
        const executionTime = end - start;

        const result = {
            summary: {
                totalUserMeals: userBalanceInfo.mealCount,
                currentRate: groupSummary.mealRate,
                currentBalance: userBalanceInfo.availableBalance + userBalanceInfo.totalSpent,
                availableBalance: userBalanceInfo.availableBalance,
                totalCost: userBalanceInfo.totalSpent,
                activeRooms: 1,
                totalMembers: groupSummary.members.length,
                totalAllMeals: groupSummary.totalMeals,
                groupBalance: groupSummary,
                groupName: room?.name || 'Unknown Group'
            },
            activities,
            chartData,
            analytics: {
                mealDistribution,
                expenseDistribution,
                monthlyExpenses,
                mealRateTrend,
                roomStats: [] 
            },
            timestamp: new Date().toISOString(),
            executionTime
        };

        return encryptData(result);
     },
     [cacheKey, 'v2-dashboard-analytics-merged'],
     { revalidate: 30, tags: [`user-${userId}`, `group-${groupId}`] }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
