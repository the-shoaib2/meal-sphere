"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from '@/lib/services/prisma';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod, getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod, getPeriodForDate } from '@/lib/utils/period-utils';
import { createNotification } from "@/lib/utils/notification-utils";
import { NotificationType, MealType } from "@prisma/client";
import { invalidateMealCache } from "@/lib/cache/cache-invalidation";
import { cacheGetOrSet, cacheDeletePattern } from '@/lib/cache/cache-service';
import { CACHE_TTL, CACHE_PREFIXES, getMealsCacheKey } from '@/lib/cache/cache-keys';
import { format, eachDayOfInterval } from 'date-fns';

/**
 * Fetches all meal-related data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchMealsData(
  userId: string,
  groupId: string,
  options?: {
    periodId?: string;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
  }
) {

  const { periodId, date } = options || {};

  const start = performance.now();

  // 1. Resolve Target Period (getCurrentPeriod is Redis-cached; getPeriodForDate is cached below)
  let currentPeriod = null;

  if (periodId) {
    currentPeriod = await prisma.mealPeriod.findUnique({
      where: { id: periodId, roomId: groupId }
    });
  } else if (date) {
    // Cache period-by-date lookups the same way getCurrentPeriod is cached
    const dateKey = format(date, 'yyyy-MM-dd');
    const cacheKey = `period_for_date:${groupId}:${dateKey}`;
    currentPeriod = await cacheGetOrSet(
      cacheKey,
      () => getPeriodForDate(groupId, date),
      { ttl: CACHE_TTL.ACTIVE_PERIOD }
    );
  } else {
    currentPeriod = await getCurrentPeriod(groupId);
  }

  if (!currentPeriod) {
    return {
      meals: [],
      guestMeals: [],
      settings: null,
      autoSettings: null,
      userStats: { breakfast: 0, lunch: 0, dinner: 0, total: 0 },
      mealDistribution: [],
      currentPeriod: null,
      roomData: null,
      userRole: null,
      timestamp: new Date().toISOString(),
      executionTime: 0
    };
  }

  // 2. Cache the full data fetch keyed by (userId, groupId, periodId).
  //    Mutations call invalidateMealCache which already deletes meals:* patterns, so
  //    we just need to include the meals prefix in the key so it gets swept up.
  const dataCacheKey = `${CACHE_PREFIXES.MEALS}:${groupId}:${currentPeriod.id}:${userId}`;

  const result = await cacheGetOrSet(
    dataCacheKey,
    async () => {
      // 3. All DB queries run in parallel — 8 round trips collapsed into one Promise.all
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
        prisma.meal.findMany({
          where: { roomId: groupId, periodId: currentPeriod!.id },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { date: 'desc' }
        }),
        prisma.guestMeal.findMany({
          where: { roomId: groupId, periodId: currentPeriod!.id },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { date: 'desc' }
        }),
        prisma.mealSettings.findUnique({ where: { roomId: groupId } }),
        prisma.autoMealSettings.findUnique({
          where: { userId_roomId: { userId, roomId: groupId } }
        }),
        prisma.meal.groupBy({
          by: ['type'],
          where: { roomId: groupId, periodId: currentPeriod!.id },
          _count: { type: true }
        }),
        prisma.room.findUnique({
          where: { id: groupId },
          select: { id: true, name: true, memberCount: true, isPrivate: true, periodMode: true }
        }),
        prisma.roomMember.findUnique({
          where: { userId_roomId: { userId, roomId: groupId } },
          select: { role: true, isBanned: true }
        }),
        prisma.meal.groupBy({
          by: ['type'],
          where: { userId, roomId: groupId, periodId: currentPeriod!.id },
          _count: { type: true }
        })
      ]);

      const userMealStats = {
        breakfast: userMealCount.find(m => m.type === 'BREAKFAST')?._count.type || 0,
        lunch: userMealCount.find(m => m.type === 'LUNCH')?._count.type || 0,
        dinner: userMealCount.find(m => m.type === 'DINNER')?._count.type || 0,
        total: userMealCount.reduce((sum, m) => sum + m._count.type, 0)
      };

      return {
        meals: meals.map(m => ({
          ...m,
          date: m.date.toISOString(),
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        guestMeals: guestMeals.map(m => ({
          ...m,
          date: m.date.toISOString(),
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        settings: mealSettings ? {
          ...mealSettings,
          createdAt: mealSettings.createdAt.toISOString(),
          updatedAt: mealSettings.updatedAt.toISOString(),
        } : null,
        autoSettings: autoMealSettings ? {
          ...autoMealSettings,
          startDate: autoMealSettings.startDate.toISOString(),
          endDate: autoMealSettings.endDate ? autoMealSettings.endDate.toISOString() : undefined,
          createdAt: autoMealSettings.createdAt.toISOString(),
          updatedAt: autoMealSettings.updatedAt.toISOString(),
        } : null,
        userStats: userMealStats,
        mealDistribution: mealDistribution.map(m => ({ name: m.type, value: m._count.type })),
        currentPeriod: {
          ...currentPeriod,
          startDate: new Date(currentPeriod!.startDate).toISOString(),
          endDate: currentPeriod!.endDate ? new Date(currentPeriod!.endDate).toISOString() : undefined,
          createdAt: new Date(currentPeriod!.createdAt).toISOString(),
          updatedAt: new Date(currentPeriod!.updatedAt).toISOString(),
        },
        roomData: roomData ? {
          ...roomData,
          periodMode: roomData.periodMode as 'MONTHLY' | 'CUSTOM' | undefined
        } : null,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        groupId,
      };
    },
    { ttl: CACHE_TTL.MEALS_LIST } // 2-minute TTL; mutations call invalidateMealCache which deletes meals:* keys
  );

  const end = performance.now();
  return {
    ...result,
    timestamp: new Date().toISOString(),
    executionTime: end - start,
  };
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
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

  const start = performance.now();
      
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        return {
          totalMeals: 0,
          byType: {},
          byUser: [],
          timestamp: new Date().toISOString(),
          executionTime: 0
        };
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
}



// --- Mutation Actions ---

export async function toggleMeal(roomId: string, userId: string, dateStr: string, type: MealType, action: 'add' | 'remove', periodId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (userId !== session.user.id) {
        try {
            await assertAdminRights(session.user.id, roomId, "Unauthorized to edit others meals");
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0); 
    let targetPeriodId = periodId;
    if (!targetPeriodId) {
        const targetPeriod = await getPeriodForDate(roomId, new Date(dateStr));
        if (!targetPeriod) return { success: false, error: "No period found for this date" };
        if (targetPeriod.isLocked) return { success: false, error: "This period is locked" };
        targetPeriodId = targetPeriod.id;
    }

    if (action === 'remove') {
        try {
            await prisma.meal.delete({
                where: {
                    userId_roomId_date_type: {
                        userId,
                        roomId,
                        date: startOfDay,
                        type
                    }
                }
            });
            await invalidateMealCache(roomId); // Invalidate cache after delete
            return { success: true };
        } catch (error: any) {
            if (error.code === 'P2025') return { success: true }; // Record to delete does not exist
            return { success: false, error: "Failed to remove meal" };
        }
    } else {
        try {
            const newMeal = await prisma.meal.create({
                data: {
                    roomId,
                    userId,
                    date: startOfDay,
                    type,
                    periodId: targetPeriodId
                },
                include: { user: { select: { id: true, name: true, image: true, email: true } } }
            });
            await invalidateMealCache(roomId); // Invalidate cache after create
            return { success: true, meal: newMeal };
        } catch (error: any) {
            if (error.code === 'P2002') return { success: false, error: "Meal already exists for this time" };
            console.error('[toggleMeal error]', error);
            return { success: false, error: "Failed to add meal" };
        }
    }
}

export async function addGuestMeal(data: { roomId: string; userId: string; dateStr: string; type: MealType; count: number; periodId?: string }) {
    const { roomId, userId, dateStr, type, count, periodId } = data;
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Authorization check
    if (userId !== session.user.id) {
        try {
            await assertAdminRights(session.user.id, roomId, "Unauthorized to edit others guest meals");
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    const normalizedDate = new Date(dateStr);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Fetch dependencies in parallel
    const [settings, todayGuestMeals] = await Promise.all([
        prisma.mealSettings.findUnique({ where: { roomId } }),
        prisma.guestMeal.findMany({ where: { userId, roomId, date: normalizedDate } })
    ]);

    if (settings && !settings.allowGuestMeals) {
        return { error: "Guest meals are not allowed in this group" };
    }

    const limit = settings?.guestMealLimit || 5;
    const otherTypesTotal = todayGuestMeals
        .filter(m => m.type !== type)
        .reduce((sum, m) => sum + m.count, 0);
    
    // In patch, count is the new total for that type
    if (otherTypesTotal + count > limit) {
        const remaining = limit - otherTypesTotal;
        return { error: `Limit exceeded. Remaining: ${remaining < 0 ? 0 : remaining}` };
    }

    // Determine period and lock status
    let targetPeriodId = periodId;
    if (!targetPeriodId) {
        const targetPeriod = await getPeriodForDate(roomId, normalizedDate);
        if (targetPeriod?.isLocked) {
            return { error: "This period is locked" };
        }
        targetPeriodId = targetPeriod?.id;
    }

    const guestMeal = await prisma.guestMeal.upsert({
        where: { guestMealIdentifier: { userId, roomId, date: normalizedDate, type } } as any,
        update: { count },
        create: {
            userId,
            roomId,
            date: normalizedDate,
            type,
            count,
            periodId: targetPeriodId
        },
        include: { user: { select: { id: true, name: true, image: true } } }
    });

    await invalidateMealCache(roomId); // Invalidate cache after guest meal update
    return { success: true, data: guestMeal };
}

export async function updateMealSettings(roomId: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        await assertAdminRights(session.user.id, roomId, "Unauthorized");
    } catch (error: any) {
        return { success: false, error: error.message };
    }

    let settings = await prisma.mealSettings.findUnique({ where: { roomId } });
    if (!settings) settings = await prisma.mealSettings.create({ data: { ...createDefaultSettings(), roomId } });

    const updated = await prisma.mealSettings.update({
        where: { id: settings.id },
        data: { ...data, updatedAt: new Date() }
    });

    await invalidateMealCache(roomId);
    return { success: true, data: updated };
}

export async function updateAutoMealSettings(roomId: string, userId: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (userId !== session.user.id) return { success: false, error: "Unauthorized" };

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

    await invalidateMealCache(roomId);
    return { success: true, data: updated };
}

// Helpers
function createDefaultSettings() {
    return {
        breakfastTime: "08:00", lunchTime: "13:00", dinnerTime: "20:00",
        autoMealEnabled: false, mealCutoffTime: "22:00", maxMealsPerDay: 3,
        allowGuestMeals: true, guestMealLimit: 5
    };
}
function createDefaultAutoSettings(userId: string, roomId: string) {
    return {
        userId, roomId, isEnabled: false,
        breakfastEnabled: true, lunchEnabled: true, dinnerEnabled: true,
        guestMealEnabled: false, startDate: new Date(),
        excludedDates: [], excludedMealTypes: []
    };
}

async function assertAdminRights(userId: string, roomId: string, customMessage = "Unauthorized") {
    const membership = await prisma.roomMember.findUnique({ where: { userId_roomId: { userId, roomId } } });
    if (!membership || !['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(membership.role)) {
        throw new Error(customMessage);
    }
}



export async function deleteGuestMeal(guestMealId: string, userId: string, periodId?: string) {
    const guestMeal = await prisma.guestMeal.findUnique({
        where: { id: guestMealId },
    });

    if (!guestMeal) {
        console.log(`[GuestMeal] Not found (already deleted): ${guestMealId}`);
        return { success: true };
    }

    if (guestMeal.userId !== userId) {
        try {
            await assertAdminRights(userId, guestMeal.roomId, "Unauthorized to edit others guest meals");
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    if (!periodId && !guestMeal.periodId) {
        const targetPeriod = await getPeriodForDate(guestMeal.roomId, guestMeal.date);
        if (targetPeriod?.isLocked) return { success: false, error: "This period is locked" };
    }

    await prisma.guestMeal.delete({
        where: { id: guestMealId }
    });

    await invalidateMealCache(guestMeal.roomId);
    return { success: true };
}

export async function triggerAutoMeals(roomId: string, dateStr: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        await assertAdminRights(session.user.id, roomId, "You don't have permission to trigger auto meals");
    } catch (error: any) {
        return { success: false, error: error.message };
    }

    const mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: roomId },
    })

    if (!mealSettings?.autoMealEnabled) {
      return { success: false, error: "Auto meal system is not enabled for this room" };
    }

    const autoMealSettingsList = await prisma.autoMealSettings.findMany({
      where: { 
        roomId: roomId,
        isEnabled: true,
      }
    })

    if (autoMealSettingsList.length === 0) {
      return { message: "No users have auto meal settings enabled" }
    }

    const targetDate = new Date(dateStr)
    const period = await getPeriodForDate(roomId, targetDate)
    
    let processedCount = 0
    let skippedCount = 0

    const startOfDayUTC = new Date(targetDate)
    startOfDayUTC.setUTCHours(0, 0, 0, 0)
    const endOfDayUTC = new Date(targetDate)
    endOfDayUTC.setUTCHours(23, 59, 59, 999)
    const [existingMeals, existingGuestMeals] = await Promise.all([
      prisma.meal.findMany({
        where: {
          roomId: roomId,
          date: { gte: startOfDayUTC, lte: endOfDayUTC }
        }
      }),
      prisma.guestMeal.findMany({
        where: {
          roomId: roomId,
          date: { gte: startOfDayUTC, lte: endOfDayUTC }
        }
      })
    ]);
    const existingMealsByUserAndType = new Map<string, typeof existingMeals>();
    const mealCountByUser = new Map<string, number>();
    const guestMealCountByUser = new Map<string, number>();

    for (const m of existingMeals) {
      const key = `${m.userId}-${m.type}`;
      if (!existingMealsByUserAndType.has(key)) existingMealsByUserAndType.set(key, []);
      existingMealsByUserAndType.get(key)!.push(m);
      mealCountByUser.set(m.userId, (mealCountByUser.get(m.userId) || 0) + 1);
    }

    for (const gm of existingGuestMeals) {
      guestMealCountByUser.set(gm.userId, (guestMealCountByUser.get(gm.userId) || 0) + gm.count);
    }

    const newMealsToCreate: any[] = [];
    const newGuestMealsToCreate: any[] = [];

    // Force processing regardless of time since this is a manual trigger
    for (const autoSetting of autoMealSettingsList) {
      const userId = autoSetting.userId

      if (autoSetting.excludedDates.includes(dateStr)) {
        skippedCount++
        continue
      }

      const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'] as const
      
      for (const mealType of mealTypes) {
        const isEnabled = mealType === 'BREAKFAST' ? autoSetting.breakfastEnabled :
                         mealType === 'LUNCH' ? autoSetting.lunchEnabled :
                         autoSetting.dinnerEnabled

        if (!isEnabled || autoSetting.excludedMealTypes.includes(mealType)) continue
        const memKey = `${userId}-${mealType}`;
        if (existingMealsByUserAndType.has(memKey)) {
          continue
        }
        const currentCount = mealCountByUser.get(userId) || 0;
        if (currentCount >= (mealSettings.maxMealsPerDay || 3)) {
          continue
        }
        newMealsToCreate.push({
          userId: userId,
          roomId: roomId,
          date: startOfDayUTC,
          type: mealType,
          periodId: period?.id || null,
        });
        mealCountByUser.set(userId, currentCount + 1);
        processedCount++

        if (autoSetting.guestMealEnabled) {
          const currentGuestCount = guestMealCountByUser.get(userId) || 0;
          
          if (currentGuestCount < (mealSettings.guestMealLimit || 5)) {
            newGuestMealsToCreate.push({
              userId: userId,
              roomId: roomId,
              date: startOfDayUTC,
              type: mealType,
              count: 1,
              periodId: period?.id || null,
            });
            guestMealCountByUser.set(userId, currentGuestCount + 1);
          }
        }
      }
    }
    if (newMealsToCreate.length > 0) {
      await prisma.meal.createMany({ data: newMealsToCreate, skipDuplicates: true });
    }
    
    if (newGuestMealsToCreate.length > 0) {
      await prisma.guestMeal.createMany({ data: newGuestMealsToCreate });
    }

    await invalidateMealCache(roomId);
    
    return {
      success: true,
      message: `Auto meals processed successfully`,
      processed: processedCount,
      skipped: skippedCount,
      totalUsers: autoMealSettingsList.length,
    }
}
