import { prisma } from '@/lib/services/prisma';
import { PeriodStatus } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

export * from './period-utils-shared';
import { formatDateSafe } from './period-utils-shared';

/**
 * Get the current active period for a room
 */
export async function getCurrentPeriod(roomId: string) {
  const cacheKey = `active_period:${roomId}`;

  const cachedFn = unstable_cache(
    async () => {
      return await prisma.mealPeriod.findFirst({
        where: {
          roomId,
          status: PeriodStatus.ACTIVE,
        },
      });
    },
    [cacheKey],
    { 
      revalidate: CACHE_TTL.ACTIVE_PERIOD,
      tags: [`group-${roomId}`, 'periods', 'active-period'] 
    }
  );

  return await cachedFn();
}

/**
 * Get period for a specific date
 */
export async function getPeriodForDate(roomId: string, date: Date) {
  const dateKey = formatDateSafe(date);
  const cacheKey = `period_for_date:${roomId}:${dateKey}`;

  const cachedFn = unstable_cache(
    async () => {
      return await prisma.mealPeriod.findFirst({
        where: {
          roomId,
          startDate: { lte: date },
          OR: [
            { endDate: { gte: date } },
            { endDate: null }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    },
    [cacheKey],
    { 
      revalidate: CACHE_TTL.ACTIVE_PERIOD,
      tags: [`group-${roomId}`, 'periods'] 
    }
  );

  return await cachedFn();
}

/**
 * Check if a room has an active period
 */
export async function hasActivePeriod(roomId: string): Promise<boolean> {
  const currentPeriod = await getCurrentPeriod(roomId);
  return !!currentPeriod;
}

/**
 * Validate that a room has an active period
 */
export async function validateActivePeriod(roomId: string) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (!currentPeriod) {
    throw new Error('No active period found. Please start a period first to manage data.');
  }
  return currentPeriod;
}

/**
 * Get period filter for queries
 */
export async function getPeriodFilter(roomId: string) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (!currentPeriod) {
    return null; // No period filter if no active period
  }
  
  return {
    periodId: currentPeriod.id,
  };
}

/**
 * Add period ID to data when creating new records
 */
export async function addPeriodIdToData(roomId: string, data: any) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (currentPeriod) {
    return {
      ...data,
      periodId: currentPeriod.id,
    };
  }
  return data;
}

/**
 * Get period-aware where clause for queries
 */
export async function getPeriodAwareWhereClause(roomId: string, additionalFilters: any = {}) {
  const currentPeriod = await getCurrentPeriod(roomId);
  
  if (!currentPeriod) {
    // If no active period, return empty result filter
    return {
      ...additionalFilters,
      id: null, // This will return no results
    };
  }
  
  return {
    ...additionalFilters,
    periodId: currentPeriod.id,
  };
}
 