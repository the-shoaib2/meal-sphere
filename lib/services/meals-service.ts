import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

/**
 * Fetches all meal-related data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchMealsData(userId: string, groupId: string) {
  const cacheKey = `meals-data-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Get current period first
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        // No active period - return empty data
        return encryptData({
          meals: [],
          guestMeals: [],
          mealSettings: null,
          autoMealSettings: null,
          userMealStats: {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            total: 0
          },
          mealDistribution: [],
          currentPeriod: null,
          roomData: null,
          userRole: null,
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      // Parallel queries for all meal-related data
      const [
        meals,
        guestMeals,
        mealSettings,
        autoMealSettings,
        mealDistribution,
        roomData,
        membership,
        userMealCount
      ] = await Promise.all([
        // User meals for current period
        prisma.meal.findMany({
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
        
        // Guest meals for current period
        prisma.guestMeal.findMany({
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
        
        // Meal settings for the group
        prisma.mealSettings.findUnique({
          where: {
            roomId: groupId
          }
        }),
        
        // Auto meal settings for the group
        prisma.autoMealSettings.findUnique({
          where: {
            roomId: groupId
          }
        }),
        
        // Meal distribution by type (current period only)
        prisma.meal.groupBy({
          by: ['type'],
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _count: {
            type: true
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
        
        // User's meal count for current period
        prisma.meal.groupBy({
          by: ['type'],
          where: {
            userId: userId,
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _count: {
            type: true
          }
        })
      ]);

      // Calculate user meal stats
      const userMealStats = {
        breakfast: userMealCount.find(m => m.type === 'BREAKFAST')?._count.type || 0,
        lunch: userMealCount.find(m => m.type === 'LUNCH')?._count.type || 0,
        dinner: userMealCount.find(m => m.type === 'DINNER')?._count.type || 0,
        total: userMealCount.reduce((sum, m) => sum + m._count.type, 0)
      };

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        meals,
        guestMeals,
        mealSettings,
        autoMealSettings,
        userMealStats,
        mealDistribution: mealDistribution.map(m => ({
          name: m.type,
          value: m._count.type
        })),
        currentPeriod,
        roomData,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'meals-data'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, 'meals'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches meal statistics for a specific date range
 */
export async function fetchMealStats(
  userId: string, 
  groupId: string, 
  startDate?: Date, 
  endDate?: Date
) {
  const cacheKey = `meal-stats-${userId}-${groupId}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        return encryptData({
          totalMeals: 0,
          byType: {},
          byUser: [],
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      const whereClause: any = {
        roomId: groupId,
        periodId: currentPeriod.id
      };

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = startDate;
        if (endDate) whereClause.date.lte = endDate;
      }

      const [totalMeals, byType, byUser] = await Promise.all([
        prisma.meal.count({ where: whereClause }),
        prisma.meal.groupBy({
          by: ['type'],
          where: whereClause,
          _count: { type: true }
        }),
        prisma.meal.groupBy({
          by: ['userId'],
          where: whereClause,
          _count: { userId: true }
        })
      ]);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        totalMeals,
        byType: byType.reduce((acc, curr) => {
          acc[curr.type] = curr._count.type;
          return acc;
        }, {} as Record<string, number>),
        byUser: byUser.map(u => ({
          userId: u.userId,
          count: u._count.userId
        })),
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'meal-stats'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, `group-${groupId}`, 'meals', 'stats'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
