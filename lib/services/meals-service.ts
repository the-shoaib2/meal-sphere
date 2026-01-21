import { prisma } from '@/lib/services/prisma';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod, getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod } from '@/lib/utils/period-utils';
import { createNotification } from "@/lib/utils/notification-utils";
import { NotificationType, MealType } from "@prisma/client";
import { invalidateMealCache } from "@/lib/cache/cache-invalidation";
import { format, eachDayOfInterval } from 'date-fns';

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
        
        // Auto meal settings for the user in this group
        prisma.autoMealSettings.findUnique({
          where: {
            userId_roomId: {
              userId: userId,
              roomId: groupId
            }
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


// --- Unified Meal System ---

export async function fetchUnifiedMealSystem(userId: string, groupId: string) {
    // 1. Fetch Basic Data (Settings, Period)
    const [settings, autoSettings, currentPeriod] = await Promise.all([
        prisma.mealSettings.findUnique({ where: { roomId: groupId } }),
        prisma.autoMealSettings.findUnique({ where: { userId_roomId: { userId, roomId: groupId } } }),
        getCurrentPeriod(groupId)
    ]);

    let targetPeriod = currentPeriod;
    if (!targetPeriod) {
        // Fallback: get most recent period
        targetPeriod = await prisma.mealPeriod.findFirst({
            where: { roomId: groupId },
            orderBy: { startDate: 'desc' }
        });
    }

    if (!targetPeriod) {
        // Return empty defaults
        return {
            settings: settings || await getOrCreateDefaultSettings(groupId),
            autoSettings: autoSettings || await getOrCreateDefaultAutoSettings(userId, groupId),
            meals: [],
            guestMeals: [],
            userStats: null,
            period: null
        }
    }

    const periodId = targetPeriod.id;
    const [meals, guestMeals] = await Promise.all([
        prisma.meal.findMany({
            where: { roomId: groupId, periodId },
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { date: 'desc' }
        }),
        prisma.guestMeal.findMany({
            where: { roomId: groupId, periodId },
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { date: 'desc' }
        })
    ]);

    // Calculate In-Memory Stats
    const userMeals: any[] = meals.filter(m => m.userId === userId);
    const userGuestMeals: any[] = guestMeals.filter(m => m.userId === userId);

    // Reuse helper logic
    const calculateUserStats = (userMeals: any[], userGuestMeals: any[], period: any) => {
         const totalRegularMeals = userMeals.length;
         const totalGuestMeals = userGuestMeals.reduce((sum: number, meal: any) => sum + meal.count, 0);
         const totalMeals = totalRegularMeals + totalGuestMeals;

         const regularByType = {
             breakfast: userMeals.filter(m => m.type === 'BREAKFAST').length,
             lunch: userMeals.filter(m => m.type === 'LUNCH').length,
             dinner: userMeals.filter(m => m.type === 'DINNER').length,
         };
         const guestByType = {
             breakfast: userGuestMeals.filter(m => m.type === 'BREAKFAST').reduce((sum: number, m: any) => sum + m.count, 0),
             lunch: userGuestMeals.filter(m => m.type === 'LUNCH').reduce((sum: number, m: any) => sum + m.count, 0),
             dinner: userGuestMeals.filter(m => m.type === 'DINNER').reduce((sum: number, m: any) => sum + m.count, 0),
         };

         // Compute Daily Stats
         const startDate = new Date(period.startDate);
         const endDate = period.endDate ? new Date(period.endDate) : new Date();
         if (endDate.getTime() - startDate.getTime() > 1000 * 60 * 60 * 24 * 365) {
              startDate.setTime(endDate.getTime() - 1000 * 60 * 60 * 24 * 31);
         }
         if (startDate > endDate) endDate.setTime(startDate.getTime());
         
         const days = eachDayOfInterval({ start: startDate, end: endDate });
        
         const mealsByDate = new Map<string, any[]>();
         const guestMealsByDate = new Map<string, any[]>();
         
         userMeals.forEach(meal => {
             const d = format(new Date(meal.date), 'yyyy-MM-dd');
             if (!mealsByDate.has(d)) mealsByDate.set(d, []);
             mealsByDate.get(d)!.push(meal);
         });
         
         userGuestMeals.forEach(meal => {
             const d = format(new Date(meal.date), 'yyyy-MM-dd');
             if (!guestMealsByDate.has(d)) guestMealsByDate.set(d, []);
             guestMealsByDate.get(d)!.push(meal);
         });

         const daily = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dMeals = mealsByDate.get(dayStr) || [];
            const dGuest = guestMealsByDate.get(dayStr) || [];
            return {
                date: dayStr,
                breakfast: dMeals.filter(m => m.type === 'BREAKFAST').length,
                lunch: dMeals.filter(m => m.type === 'LUNCH').length,
                dinner: dMeals.filter(m => m.type === 'DINNER').length,
                guestBreakfast: dGuest.filter(m => m.type === 'BREAKFAST').reduce((s: number, m: any) => s + m.count, 0),
                guestLunch: dGuest.filter(m => m.type === 'LUNCH').reduce((s: number, m: any) => s + m.count, 0),
                guestDinner: dGuest.filter(m => m.type === 'DINNER').reduce((s: number, m: any) => s + m.count, 0),
                total: dMeals.length + dGuest.reduce((s: number, m: any) => s + m.count, 0)
            };
         });

         return {
             totals: { regularMeals: totalRegularMeals, guestMeals: totalGuestMeals, total: totalMeals },
             byType: {
                 breakfast: { regular: regularByType.breakfast, guest: guestByType.breakfast, total: regularByType.breakfast + guestByType.breakfast },
                 lunch: { regular: regularByType.lunch, guest: guestByType.lunch, total: regularByType.lunch + guestByType.lunch },
                 dinner: { regular: regularByType.dinner, guest: guestByType.dinner, total: regularByType.dinner + guestByType.dinner },
             },
             daily
         };
    };

    const userStats = calculateUserStats(userMeals, userGuestMeals, targetPeriod);

    return {
        settings: settings || await getOrCreateDefaultSettings(groupId),
        autoSettings: autoSettings || await getOrCreateDefaultAutoSettings(userId, groupId),
        meals,
        guestMeals,
        userStats,
        period: targetPeriod
    };
}


// --- Mutation Actions ---

export async function toggleMeal(roomId: string, userId: string, date: Date, type: MealType) {
    const currentPeriod = await getCurrentPeriod(roomId);
    if (!currentPeriod) throw new Error("No active period found");
    
    // Check if meal exists
    const existingMeal = await prisma.meal.findFirst({
        where: {
            userId,
            roomId,
            date,
            type,
            periodId: currentPeriod.id
        }
    });

    if (existingMeal) {
        await prisma.meal.delete({ where: { id: existingMeal.id } });
    } else {
        await prisma.meal.create({
            data: {
                roomId,
                userId,
                date,
                type,
                periodId: currentPeriod.id
            }
        });
    }

    return !existingMeal; // Returns true if created (active), false if deleted
}

export async function createGuestMeal(data: { roomId: string; userId: string; date: Date; type: MealType; count: number }) {
    const { roomId, userId, date, type, count } = data;
    
    const settings = await prisma.mealSettings.findUnique({ where: { roomId } });
    if (settings && !settings.allowGuestMeals) throw new Error("Guest meals are not allowed");
    
    // Count limit check
    const todayGuestMeals = await prisma.guestMeal.findMany({
        where: { userId, roomId, date }
    });
    const totalToday = todayGuestMeals.reduce((sum, m) => sum + m.count, 0);
    const limit = settings?.guestMealLimit || 5;

    if (totalToday + count > limit) throw new Error(`Limit exceeded. Remaining: ${limit - totalToday}`);

    const currentPeriod = await getCurrentPeriod(roomId);

    const guestMeal = await prisma.guestMeal.create({
        data: {
            userId,
            roomId,
            date,
            type,
            count,
            periodId: currentPeriod?.id
        },
        include: { user: { select: { name: true } } }
    });

    return guestMeal;
}

export async function updateMealSettings(roomId: string, data: any) {
    let settings = await prisma.mealSettings.findUnique({ where: { roomId } });
    if (!settings) settings = await prisma.mealSettings.create({ data: { ...createDefaultSettings(), roomId } });

    const updated = await prisma.mealSettings.update({
        where: { id: settings.id },
        data: { ...data, updatedAt: new Date() }
    });

    return updated;
}

export async function updateAutoMealSettings(roomId: string, userId: string, data: any) {
    let autoSettings = await prisma.autoMealSettings.findUnique({ where: { userId_roomId: { userId, roomId } } });
    if (!autoSettings) {
        autoSettings = await prisma.autoMealSettings.create({ 
            data: { ...createDefaultAutoSettings(userId, roomId) } 
        });
    }

    const updated = await prisma.autoMealSettings.update({
        where: { id: autoSettings.id },
        data: { ...data, updatedAt: new Date() }
    });

    return updated;
}

// Helpers
function createDefaultSettings() {
    return {
        breakfastTime: "08:00", lunchTime: "13:00", dinnerTime: "20:00",
        autoMealEnabled: false, mealCutoffTime: "22:00", maxMealsPerDay: 3,
        allowGuestMeals: true, guestMealLimit: 5
    };
}
async function getOrCreateDefaultSettings(roomId: string) {
    return { ...createDefaultSettings(), roomId, createdAt: new Date() };
}
function createDefaultAutoSettings(userId: string, roomId: string) {
    return {
        userId, roomId, isEnabled: false,
        breakfastEnabled: true, lunchEnabled: true, dinnerEnabled: true,
        guestMealEnabled: false, startDate: new Date(),
        excludedDates: [], excludedMealTypes: []
    };
}
async function getOrCreateDefaultAutoSettings(userId: string, roomId: string) {
    return { ...createDefaultAutoSettings(userId, roomId), createdAt: new Date() };
}
