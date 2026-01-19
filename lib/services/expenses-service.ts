import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

/**
 * Fetches all expense-related data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchExpensesData(userId: string, groupId: string) {
  const cacheKey = `expenses-data-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Get current period first
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        // No active period - return empty data
        return encryptData({
          expenses: [],
          expenseDistribution: [],
          statistics: {
            total: 0,
            totalAmount: 0,
            byType: {}
          },
          currentPeriod: null,
          roomData: null,
          userRole: null,
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      // Parallel queries for all expense-related data
      const [
        expenses,
        expenseDistribution,
        expenseStats,
        expensesByType,
        roomData,
        membership
      ] = await Promise.all([
        // All expenses for current period
        prisma.extraExpense.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }),
        
        // Expense distribution by type
        prisma.extraExpense.groupBy({
          by: ['type'],
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _sum: {
            amount: true
          },
          _count: {
            type: true
          }
        }),
        
        // Overall expense statistics
        prisma.extraExpense.aggregate({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _count: {
            id: true
          },
          _sum: {
            amount: true
          },
          _avg: {
            amount: true
          }
        }),
        
        // Expenses grouped by type with details
        prisma.extraExpense.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            date: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }),
        
        // Room data
        prisma.room.findUnique({
          where: {
            id: groupId
          },
          select: {
            id: true,
            name: true,
            memberCount: true,
            isPrivate: true
          }
        }),
        
        // User membership and role
        prisma.roomMember.findUnique({
          where: {
            userId_roomId: {
              userId: userId,
              roomId: groupId
            }
          },
          select: {
            role: true,
            isBanned: true
          }
        })
      ]);

      // Process expense distribution
      const byType = expenseDistribution.reduce((acc, curr) => {
        acc[curr.type] = {
          count: curr._count.type,
          total: curr._sum.amount || 0
        };
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        expenses,
        expenseDistribution: expenseDistribution.map(e => ({
          name: e.type,
          value: e._sum.amount || 0,
          count: e._count.type
        })),
        statistics: {
          total: expenseStats._count.id,
          totalAmount: expenseStats._sum.amount || 0,
          averageAmount: expenseStats._avg.amount || 0,
          byType
        },
        currentPeriod,
        roomData,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'expenses-data'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, 'expenses'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches expense trends and analytics
 */
export async function fetchExpenseAnalytics(userId: string, groupId: string) {
  const cacheKey = `expense-analytics-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        return encryptData({
          monthlyTrend: [],
          topExpenses: [],
          byUser: [],
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      const [monthlyTrend, topExpenses, byUser] = await Promise.all([
        // Monthly expense trend
        prisma.extraExpense.groupBy({
          by: ['date'],
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _sum: {
            amount: true
          },
          orderBy: {
            date: 'asc'
          }
        }),
        
        // Top 10 expenses
        prisma.extraExpense.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            amount: 'desc'
          },
          take: 10
        }),
        
        // Expenses by user
        prisma.extraExpense.groupBy({
          by: ['userId'],
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _count: {
            id: true
          },
          _sum: {
            amount: true
          }
        })
      ]);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        monthlyTrend: monthlyTrend.map(m => ({
          date: m.date.toISOString().split('T')[0],
          amount: m._sum.amount || 0
        })),
        topExpenses,
        byUser: byUser.map(u => ({
          userId: u.userId,
          count: u._count.id,
          total: u._sum.amount || 0
        })),
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'expense-analytics'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, `group-${groupId}`, 'expenses', 'analytics'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
