import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod } from '@/lib/utils/period-utils';
import { 
  getGroupBalanceSummary,
  calculateBalance,
  calculateUserMealCount,
  calculateMealRate,
  calculateTotalExpenses
} from '@/lib/services/balance-service';

/**
 * Fetches all calculation-related data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchCalculationsData(userId: string, groupId: string) {
  const cacheKey = `calculations-data-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Get current period first
      const currentPeriod = await getCurrentPeriod(groupId);
      const periodId = currentPeriod?.id;
      
      if (!currentPeriod) {
        // No active period - return empty data
        return encryptData({
          groupBalanceSummary: null,
          userBalance: {
            balance: 0,
            mealCount: 0,
            totalSpent: 0,
            availableBalance: 0,
            mealRate: 0
          },
          memberBalances: [],
          mealRateInfo: {
            mealRate: 0,
            totalMeals: 0,
            totalExpenses: 0
          },
          payments: [],
          currentPeriod: null,
          roomData: null,
          userRole: null,
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      // Parallel queries for all calculation-related data
      const [
        totalExpenses,
        totalMeals,
        roomData,
        membership,
        payments
      ] = await Promise.all([
        // Total expenses for current period
        calculateTotalExpenses(groupId, periodId),
        
        // Total meals for current period
        prisma.meal.count({
          where: {
            roomId: groupId,
            periodId: periodId
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
        }),
        
        // Recent payments
        prisma.payment.findMany({
          where: {
            roomId: groupId,
            periodId: periodId
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
          },
          take: 50
        })
      ]);

      // Calculate meal rate
      const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

      // Now fetch group balance summary with pre-calculated values
      const [groupBalanceSummary, userBalance, userMealCount] = await Promise.all([
        getGroupBalanceSummary(groupId, true, {
          totalExpenses,
          totalMeals,
          mealRate
        }),
        
        calculateBalance(userId, groupId, periodId),
        
        calculateUserMealCount(userId, groupId, periodId)
      ]);

      // Calculate user's total spent and available balance
      const totalSpent = userMealCount * mealRate;
      const availableBalance = userBalance - totalSpent;

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        groupBalanceSummary,
        userBalance: {
          balance: userBalance,
          mealCount: userMealCount,
          totalSpent,
          availableBalance,
          mealRate
        },
        memberBalances: groupBalanceSummary.members || [],
        mealRateInfo: {
          mealRate,
          totalMeals,
          totalExpenses
        },
        payments,
        currentPeriod,
        roomData,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'calculations-data'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, 'calculations'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches member-wise meal and balance breakdown
 */
export async function fetchMemberBreakdown(userId: string, groupId: string) {
  const cacheKey = `member-breakdown-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const currentPeriod = await getCurrentPeriod(groupId);
      const periodId = currentPeriod?.id;
      
      if (!currentPeriod) {
        return encryptData({
          members: [],
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      // Parallel queries for member breakdown
      const [members, mealCounts, balances, payments] = await Promise.all([
        // All members
        prisma.roomMember.findMany({
          where: {
            roomId: groupId
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true
              }
            }
          }
        }),
        
        // Meal counts by user
        prisma.meal.groupBy({
          by: ['userId'],
          where: {
            roomId: groupId,
            periodId: periodId
          },
          _count: {
            id: true
          }
        }),
        
        // Balances by user
        prisma.accountTransaction.groupBy({
          by: ['targetUserId'],
          where: {
            roomId: groupId,
            periodId: periodId
          },
          _sum: {
            amount: true
          }
        }),
        
        // Payments by user
        prisma.payment.groupBy({
          by: ['userId'],
          where: {
            roomId: groupId,
            periodId: periodId,
            status: 'COMPLETED'
          },
          _sum: {
            amount: true
          },
          _count: {
            id: true
          }
        })
      ]);

      // Create maps for quick lookup
      const mealCountMap = new Map(mealCounts.map(m => [m.userId, m._count.id]));
      const balanceMap = new Map(balances.map(b => [b.targetUserId, b._sum.amount || 0]));
      const paymentMap = new Map(payments.map(p => [p.userId, {
        total: p._sum.amount || 0,
        count: p._count.id
      }]));

      // Calculate meal rate
      const totalMeals = mealCounts.reduce((sum, m) => sum + m._count.id, 0);
      const totalExpenses = await calculateTotalExpenses(groupId, periodId);
      const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

      // Combine data for each member
      const memberBreakdown = members.map(member => {
        const mealCount = mealCountMap.get(member.userId) || 0;
        const balance = balanceMap.get(member.userId) || 0;
        const paymentInfo = paymentMap.get(member.userId) || { total: 0, count: 0 };
        const totalSpent = mealCount * mealRate;
        const availableBalance = balance - totalSpent;

        return {
          userId: member.userId,
          userName: member.user.name,
          userImage: member.user.image,
          userEmail: member.user.email,
          role: member.role,
          mealCount,
          balance,
          totalSpent,
          availableBalance,
          payments: paymentInfo.total,
          paymentCount: paymentInfo.count,
          mealRate
        };
      });

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        members: memberBreakdown,
        summary: {
          totalMembers: members.length,
          totalMeals,
          totalExpenses,
          mealRate,
          totalPayments: payments.reduce((sum, p) => sum + (p._sum.amount || 0), 0)
        },
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'member-breakdown'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, `group-${groupId}`, 'calculations', 'members'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Cached wrapper for Room Meal Summary (The main calculation sheet)
 */
export async function fetchRoomMealSummary(
  roomId: string,
  startDate: string | Date, // Allow string for easier serialization
  endDate: string | Date,
  periodId?: string
) {
  // Normalize dates to strings for cache key
  const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  const cacheKey = `room-meal-summary-${roomId}-${periodId || startStr + '-' + endStr}`;
  
  const cachedFn = unstable_cache(
      async () => {
          const { calculateRoomMealSummary } = await import('@/lib/meal-calculations');
          const sDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
          const eDate = typeof endDate === 'string' ? new Date(endDate) : endDate;
          
          const summary = await calculateRoomMealSummary(roomId, sDate, eDate, periodId);
          return encryptData(summary);
      },
      [cacheKey, 'room-meal-summary'],
      {
          revalidate: 60,
          tags: [`group-${roomId}`, 'calculations', 'meals', 'expenses', 'payments']
      }
  );
  
  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Cached wrapper for User Meal Summary
 */
export async function fetchUserMealSummary(
  userId: string,
  roomId: string,
  startDate: string | Date,
  endDate: string | Date,
  periodId?: string
) {
  const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  const cacheKey = `user-meal-summary-${userId}-${roomId}-${periodId || startStr + '-' + endStr}`;
  
  const cachedFn = unstable_cache(
      async () => {
          const { calculateUserMealSummary } = await import('@/lib/meal-calculations');
          const sDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
          const eDate = typeof endDate === 'string' ? new Date(endDate) : endDate;
          
          const summary = await calculateUserMealSummary(userId, roomId, sDate, eDate, periodId);
          return encryptData(summary);
      },
      [cacheKey, 'user-meal-summary'],
      {
          revalidate: 60,
          tags: [`user-${userId}`, `group-${roomId}`, 'calculations']
      }
  );
  
  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
