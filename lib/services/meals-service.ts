"use server";

import { unstable_cache } from 'next/cache';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from '@/lib/services/prisma';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod, getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod, getPeriodForDate } from '@/lib/utils/period-utils';
import { createNotification } from "@/lib/utils/notification-utils";
import { NotificationType, MealType } from "@prisma/client";
import { invalidateMealCache } from "@/lib/cache/cache-invalidation";
import { cacheDeletePattern } from '@/lib/cache/cache-service';
import { CACHE_TTL, CACHE_PREFIXES, getMealsCacheKey } from '@/lib/cache/cache-keys';
import { format, eachDayOfInterval } from 'date-fns';
import { canUserEditMeal, formatDateSafe, parseDateSafe } from '@/lib/utils/period-utils-shared';

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
    const dateKey = formatDateSafe(date);
    const cacheKey = `period_for_date:${groupId}:${dateKey}`;
    
    const cachedFn = unstable_cache(
      () => getPeriodForDate(groupId, date),
      [cacheKey],
      { 
        revalidate: CACHE_TTL.ACTIVE_PERIOD,
        tags: [`group-${groupId}`, 'periods'] 
      }
    );
    currentPeriod = await cachedFn();
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

  try {
    const cachedFn = unstable_cache(
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
          userMealCount,
          roomDataWithMembers
        ] = await Promise.all([
          prisma.meal.findMany({
            where: { 
              roomId: groupId, 
              date: {
                gte: currentPeriod!.startDate,
                lte: currentPeriod!.endDate || new Date('2099-12-31')
              }
            },
            select: {
              id: true,
              date: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              userId: true,
              roomId: true,
              periodId: true,
              user: { select: { id: true, name: true, image: true } } 
            },
            orderBy: { date: 'desc' }
          }),
          prisma.guestMeal.findMany({
            where: { 
              roomId: groupId, 
              date: {
                gte: currentPeriod!.startDate,
                lte: currentPeriod!.endDate || new Date('2099-12-31')
              }
            },
            select: {
              id: true,
              date: true,
              type: true,
              count: true,
              createdAt: true,
              updatedAt: true,
              userId: true,
              roomId: true,
              periodId: true,
              user: { select: { id: true, name: true, image: true } }
            },
            orderBy: { date: 'desc' }
          }),
          prisma.mealSettings.findUnique({ where: { roomId: groupId } }),
          prisma.autoMealSettings.findUnique({
            where: { userId_roomId: { userId, roomId: groupId } }
          }),
          prisma.meal.groupBy({
            by: ['type'],
            where: { 
              roomId: groupId, 
              date: {
                gte: currentPeriod!.startDate,
                lte: currentPeriod!.endDate || new Date('2099-12-31')
              }
            },
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
            where: { 
              userId, 
              roomId: groupId, 
              date: {
                gte: currentPeriod!.startDate,
                lte: currentPeriod!.endDate || new Date('2099-12-31')
              }
            },
            _count: { type: true }
          }),
          import('@/lib/group-query-helpers').then(m => m.getGroupWithMembers(groupId))
        ]);

        const userMealStats = {
          breakfast: userMealCount.find(m => m.type === 'BREAKFAST')?._count.type || 0,
          lunch: userMealCount.find(m => m.type === 'LUNCH')?._count.type || 0,
          dinner: userMealCount.find(m => m.type === 'DINNER')?._count.type || 0,
          total: userMealCount.reduce((sum, m) => sum + m._count.type, 0)
        };

        const result = {
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
          members: (roomDataWithMembers as any)?.members || [],
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

        return encryptData(result); 
      },
      [dataCacheKey, 'meals-data'],
      { 
        revalidate: CACHE_TTL.MEALS_LIST,
        tags: [`group-${groupId}`, `user-${userId}`, `meals-${groupId}`] 
      }
    );

    // Handle potential data migrations or stale cache gracefully
    const cachedData = await cachedFn();
    let result: any;

    if (typeof cachedData === 'string' && (cachedData.includes(':') || cachedData.length > 50)) {
      try {
        result = decryptData(cachedData);
      } catch (e) {
        console.warn("[fetchMealsData] Failed to decrypt cached string, assuming raw data or corrupted cache", e);
        // If it looks like JSON but decryption failed, maybe it's just a stringified object
        try {
          result = JSON.parse(cachedData);
        } catch {
          result = cachedData;
        }
      }
    } else {
      result = cachedData;
    }

    const end = performance.now();
    
    // Ensure we have a valid result object
    if (!result || typeof result !== 'object') {
      console.warn("[fetchMealsData] Cached data was invalid, returning empty state");
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
          isBanned: false,
          groupId: groupId,
          timestamp: new Date().toISOString(),
          executionTime: end - start
      };
    }

    return {
      ...result,
      timestamp: new Date().toISOString(),
      executionTime: end - start,
    };
  } catch (error) {
    console.error("[fetchMealsData] Error fetching meals data:", error);
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
}

/**
 * Fetches meal settings for a room
 */
export async function fetchMealSettings(roomId: string) {
  const cacheKey = `meal-settings:${roomId}`;
  const cachedFn = unstable_cache(
    async () => {
      const settings = await prisma.mealSettings.findUnique({ where: { roomId } });
      if (!settings) return null;
      return {
        ...settings,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    },
    [cacheKey],
    { 
      revalidate: CACHE_TTL.MEALS_LIST, 
      tags: [`group-${roomId}`, 'meal-settings'] 
    }
  );
  return await cachedFn();
}

/**
 * Fetches auto meal settings for a user
 */
export async function fetchAutoMealSettings(userId: string, roomId: string) {
  const cacheKey = `auto-meal-settings:${roomId}:${userId}`;
  const cachedFn = unstable_cache(
    async () => {
      const settings = await prisma.autoMealSettings.findUnique({
        where: { userId_roomId: { userId, roomId } }
      });
      if (!settings) return null;
      return {
        ...settings,
        startDate: settings.startDate.toISOString(),
        endDate: settings.endDate ? settings.endDate.toISOString() : undefined,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    },
    [cacheKey],
    { 
      revalidate: CACHE_TTL.MEALS_LIST, 
      tags: [`group-${roomId}`, `user-${userId}`, 'auto-meal-settings'] 
    }
  );
  return await cachedFn();
}

/**
 * Fetches user meal stats
 */
export async function fetchUserMealStats(userId: string, roomId: string) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (!currentPeriod) return null;

  const cacheKey = `user-meal-stats:${roomId}:${currentPeriod.id}:${userId}`;
  const cachedFn = unstable_cache(
    async () => {
      const userMealCount = await prisma.meal.groupBy({
        by: ['type'],
        where: { userId, roomId, periodId: currentPeriod.id },
        _count: { type: true }
      });

      return {
        breakfast: userMealCount.find(m => m.type === 'BREAKFAST')?._count.type || 0,
        lunch: userMealCount.find(m => m.type === 'LUNCH')?._count.type || 0,
        dinner: userMealCount.find(m => m.type === 'DINNER')?._count.type || 0,
        total: userMealCount.reduce((sum, m) => sum + m._count.type, 0)
      };
    },
    [cacheKey],
    { 
      revalidate: CACHE_TTL.MEALS_LIST, 
      tags: [`group-${roomId}`, `user-${userId}`, 'meal-stats'] 
    }
  );
  return await cachedFn();
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


