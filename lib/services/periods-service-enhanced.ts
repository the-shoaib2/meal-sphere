import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { PeriodService } from '@/lib/services/period-service';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

/**
 * Fetches all period-related data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchPeriodsData(userId: string, groupId: string, includeArchived: boolean = false) {
  const cacheKey = `periods-data-${userId}-${groupId}-${includeArchived}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Parallel queries for all period-related data
      const [
        periods,
        activePeriod,
        periodStats,
        roomData,
        membership
      ] = await Promise.all([
        // All periods for the group
        PeriodService.getPeriods(groupId, includeArchived),
        
        // Current active period
        getCurrentPeriod(groupId),
        
        // Period statistics
        prisma.mealPeriod.aggregate({
          where: {
            roomId: groupId,
            ...(includeArchived ? {} : { status: 'ACTIVE' })
          },
          _count: {
            id: true
          },
          _sum: {
            openingBalance: true
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
            isPrivate: true,
            periodMode: true
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

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        periods,
        activePeriod,
        periodStats: {
          totalPeriods: periodStats._count.id,
          totalOpeningBalance: periodStats._sum.openingBalance || 0
        },
        roomData,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'periods-data'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, `group-${groupId}`, 'periods'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches detailed data for a specific period
 */
export async function fetchPeriodDetails(userId: string, groupId: string, periodId: string) {
  const cacheKey = `period-details-${userId}-${groupId}-${periodId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Parallel queries for period details
      const [
        period,
        mealCount,
        expenseCount,
        paymentCount,
        shoppingCount,
        memberActivity
      ] = await Promise.all([
        // Period details
        prisma.mealPeriod.findUnique({
          where: {
            id: periodId
          },
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }),
        
        // Meal count for this period
        prisma.meal.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        
        // Expense count for this period
        prisma.extraExpense.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        
        // Payment count for this period
        prisma.payment.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        
        // Shopping items count for this period
        prisma.shoppingItem.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        
        // Member activity in this period
        prisma.meal.groupBy({
          by: ['userId'],
          where: {
            periodId: periodId,
            roomId: groupId
          },
          _count: {
            userId: true
          }
        })
      ]);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        period,
        statistics: {
          totalMeals: mealCount,
          totalExpenses: expenseCount,
          totalPayments: paymentCount,
          totalShoppingItems: shoppingCount,
          activeMemberCount: memberActivity.length
        },
        memberActivity: memberActivity.map(m => ({
          userId: m.userId,
          mealCount: m._count.userId
        })),
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'period-details'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, `period-${periodId}`, 'periods'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
