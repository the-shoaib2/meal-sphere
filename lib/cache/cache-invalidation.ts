import { revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { cacheDeletePattern, cacheInvalidateByTag } from './cache-service';

import {
  getDashboardCacheKey,
  getAnalyticsCacheKey,
  getCalculationsCacheKey,
  getMealsCacheKey,
  getPaymentsCacheKey,
  getExpensesCacheKey,
  getShoppingCacheKey,
  getRoomRelatedPatterns,
  getUserRelatedPatterns,
  getCachePattern,
  CACHE_PREFIXES,
} from './cache-keys';

/**
 * Centralized cache invalidation logic
 * Call these functions after data mutations to keep cache consistent
 */

/**
 * Invalidate all meal-related caches for a room
 */
export async function invalidateMealCache(
  roomId: string,
  periodId?: string,
  userId?: string
): Promise<void> {
  const patterns = [
    getMealsCacheKey(roomId, periodId),
    getCachePattern(CACHE_PREFIXES.MEALS, roomId),
    getCachePattern(CACHE_PREFIXES.DASHBOARD, roomId),
    getCachePattern(CACHE_PREFIXES.ANALYTICS, roomId),
    getCachePattern(CACHE_PREFIXES.CALCULATIONS, roomId),
  ];

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  // Also invalidate Next.js tags
  revalidateTag(`group-${roomId}`);
  revalidateTag(`meals-${roomId}`);
  if (userId) revalidateTag(`user-${userId}`);
  
  console.log(`🗑️  Invalidated meal cache for room ${roomId}${userId ? ` and user ${userId}` : ''}`);
}

/**
 * Invalidate payment-related caches
 */
export async function invalidatePaymentCache(
  userId: string,
  roomId?: string
): Promise<void> {
  const patterns = [
    getPaymentsCacheKey(userId, roomId),
    getCachePattern(CACHE_PREFIXES.PAYMENTS, userId),
  ];

  if (roomId) {
    patterns.push(
      getCachePattern(CACHE_PREFIXES.DASHBOARD, roomId),
      getCachePattern(CACHE_PREFIXES.ANALYTICS, roomId),
      getCachePattern(CACHE_PREFIXES.CALCULATIONS, roomId)
    );
  }

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  // Also invalidate Next.js tags
  revalidateTag(`user-${userId}`);
  if (roomId) revalidateTag(`group-${roomId}`);
  
  console.log(`🗑️  Invalidated payment cache for user ${userId}`);
}

/**
 * Invalidate dashboard caches for a group
 */
export async function invalidateDashboardCache(
  groupId: string,
  userId?: string
): Promise<void> {
  const patterns = [getCachePattern(CACHE_PREFIXES.DASHBOARD, groupId)];

  if (userId) {
    patterns.push(getDashboardCacheKey(userId, groupId));
  }

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  console.log(`🗑️  Invalidated dashboard cache for group ${groupId}`);
}

/**
 * Invalidate analytics caches for a group
 */
export async function invalidateAnalyticsCache(groupId: string): Promise<void> {
  const patterns = [
    getCachePattern(CACHE_PREFIXES.ANALYTICS, groupId),
  ];

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  console.log(`🗑️  Invalidated analytics cache for group ${groupId}`);
}

/**
 * Invalidate calculation caches for a room
 */
export async function invalidateCalculationsCache(
  roomId: string,
  periodId?: string
): Promise<void> {
  const patterns = [
    getCachePattern(CACHE_PREFIXES.CALCULATIONS, roomId),
  ];

  if (periodId) {
    patterns.push(getCalculationsCacheKey(roomId, periodId));
  }

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  console.log(`🗑️  Invalidated calculations cache for room ${roomId}`);
}

/**
 * Invalidate expense-related caches
 */
export async function invalidateExpenseCache(
  roomId: string,
  periodId?: string
): Promise<void> {
  const patterns = [
    getExpensesCacheKey(roomId, periodId),
    getCachePattern(CACHE_PREFIXES.EXPENSES, roomId),
    getCachePattern(CACHE_PREFIXES.DASHBOARD, roomId),
    getCachePattern(CACHE_PREFIXES.ANALYTICS, roomId),
    getCachePattern(CACHE_PREFIXES.CALCULATIONS, roomId),
  ];

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  // Also invalidate Next.js tags
  revalidateTag(`group-${roomId}`);
  revalidateTag('expenses');
  
  console.log(`🗑️  Invalidated expense cache for room ${roomId}`);
}

/**
 * Invalidate shopping item caches
 */
export async function invalidateShoppingCache(
  roomId: string,
  periodId?: string
): Promise<void> {
  const patterns = [
    getShoppingCacheKey(roomId, periodId),
    getCachePattern(CACHE_PREFIXES.SHOPPING, roomId),
    getCachePattern(CACHE_PREFIXES.DASHBOARD, roomId),
    getCachePattern(CACHE_PREFIXES.ANALYTICS, roomId),
  ];

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  // Also invalidate Next.js tags
  revalidateTag(`group-${roomId}`);
  revalidateTag(`shopping-${roomId}`);
  
  console.log(`🗑️  Invalidated shopping cache for room ${roomId}`);
}

/**
 * Invalidate all caches related to a room
 */
export async function invalidateRoomCache(roomId: string): Promise<void> {
  const patterns = getRoomRelatedPatterns(roomId);
  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  console.log(`🗑️  Invalidated all caches for room ${roomId}`);
}

/**
 * Invalidate all caches related to a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const patterns = getUserRelatedPatterns(userId);
  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  console.log(`🗑️  Invalidated all caches for user ${userId}`);
}

/**
 * Invalidate all caches related to a period
 */
export async function invalidatePeriodCache(
  roomId: string,
  periodId: string
): Promise<void> {
  const patterns = [
    getCachePattern(CACHE_PREFIXES.PERIODS, roomId, periodId),
    getCachePattern(CACHE_PREFIXES.MEALS, roomId, periodId),
    getCachePattern(CACHE_PREFIXES.EXPENSES, roomId, periodId),
    getCachePattern(CACHE_PREFIXES.SHOPPING, roomId, periodId),
    getCachePattern(CACHE_PREFIXES.CALCULATIONS, roomId, periodId),
    getCachePattern(CACHE_PREFIXES.DASHBOARD, roomId),
    getCachePattern(CACHE_PREFIXES.ANALYTICS, roomId),
  ];

  await Promise.all(patterns.map(pattern => cacheDeletePattern(pattern)));
  
  console.log(`🗑️  Invalidated all caches for period ${periodId} in room ${roomId}`);
}

/**
 * Smart invalidation based on mutation type
 * Use this as a convenience function for common operations
 */
export async function invalidateCacheForMutation(
  type: 'meal' | 'payment' | 'expense' | 'shopping' | 'period',
  data: {
    roomId?: string;
    userId?: string;
    periodId?: string;
  }
): Promise<void> {
  switch (type) {
    case 'meal':
      if (data.roomId) {
        await invalidateMealCache(data.roomId, data.periodId, data.userId);
      }
      break;
    
    case 'payment':
      if (data.userId) {
        await invalidatePaymentCache(data.userId, data.roomId);
      }
      break;
    
    case 'expense':
      if (data.roomId) {
        await invalidateExpenseCache(data.roomId, data.periodId);
      }
      break;
    
    case 'shopping':
      if (data.roomId) {
        await invalidateShoppingCache(data.roomId, data.periodId);
      }
      break;
    
    case 'period':
      if (data.roomId && data.periodId) {
        await invalidatePeriodCache(data.roomId, data.periodId);
      }
      break;
  }
}
