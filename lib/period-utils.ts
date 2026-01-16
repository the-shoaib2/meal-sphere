import { prisma } from '@/lib/prisma';
import { PeriodStatus } from '@prisma/client';
import { cacheGetOrSet } from '@/lib/cache-service';
import { CACHE_TTL } from '@/lib/cache-keys';

export * from './period-utils-shared';

/**
 * Get the current active period for a room
 */
export async function getCurrentPeriod(roomId: string) {
  const cacheKey = `active_period:${roomId}`;

  return await cacheGetOrSet(
    cacheKey,
    async () => {
      return await prisma.mealPeriod.findFirst({
        where: {
          roomId,
          status: PeriodStatus.ACTIVE,
        },
      });
    },
    { ttl: CACHE_TTL.ACTIVE_PERIOD }
  );
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
 