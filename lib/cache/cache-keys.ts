/**
 * Centralized cache key generation and management
 * Ensures consistent naming conventions across the application
 */

export const CACHE_PREFIXES = {
  DASHBOARD: 'dashboard_v2',
  ANALYTICS: 'analytics_v2',
  CALCULATIONS: 'calculations',
  MEALS: 'meals',
  PAYMENTS: 'payments',
  EXPENSES: 'expenses',
  SHOPPING: 'shopping',
  USERS: 'users',
  ROOMS: 'rooms',
  PERIODS: 'periods',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'group_members',
  GROUP_ROLE: 'group_role',
  JOIN_REQUESTS: 'join_requests',
  INVITATIONS: 'invitations',
} as const;

export const CACHE_TTL = {
  // Short TTL for frequently changing data
  ACTIVE_PERIOD: 60, // 1 minute
  DASHBOARD: 120, // 2 minutes (increased from 60s)
  MEALS_LIST: 120, // 2 minutes
  ACTIVITIES: 120, // 2 minutes (new for activity feeds)
  
  // Medium TTL for semi-static data
  CALCULATIONS_ACTIVE: 180, // 3 minutes (increased from 120s)
  ANALYTICS: 300, // 5 minutes
  USER_STATS: 300, // 5 minutes
  
  // Long TTL for historical/closed data
  CALCULATIONS_CLOSED: 3600, // 1 hour
  HISTORICAL_DATA: 3600, // 1 hour
  
  // Very long TTL for rarely changing data
  ROOM_INFO: 7200, // 2 hours
  USER_INFO: 7200, // 2 hours
  
  // Group-specific TTLs
  GROUPS_LIST: 120, // 2 minutes
  GROUP_DETAILS: 180, // 3 minutes
  GROUP_MEMBERS: 120, // 2 minutes
  GROUP_ROLE: 300, // 5 minutes (rarely changes)
  JOIN_REQUESTS: 60, // 1 minute
  INVITATIONS: 180, // 3 minutes
} as const;

/**
 * Generate cache key for dashboard data
 */
export function getDashboardCacheKey(userId: string, groupId: string): string {
  return `${CACHE_PREFIXES.DASHBOARD}:${groupId}:${userId}`;
}

/**
 * Generate cache key for analytics data
 */
export function getAnalyticsCacheKey(groupId: string, userId?: string): string {
  if (userId) {
    return `${CACHE_PREFIXES.ANALYTICS}:${groupId}:${userId}`;
  }
  return `${CACHE_PREFIXES.ANALYTICS}:${groupId}`;
}

/**
 * Generate cache key for calculations
 */
export function getCalculationsCacheKey(
  roomId: string,
  periodId?: string,
  userId?: string
): string {
  const parts = [CACHE_PREFIXES.CALCULATIONS, roomId];
  if (periodId) parts.push(periodId);
  if (userId) parts.push(userId);
  return parts.join(':');
}

/**
 * Generate cache key for meals list
 */
export function getMealsCacheKey(
  roomId: string,
  periodId?: string,
  startDate?: string,
  endDate?: string
): string {
  const parts = [CACHE_PREFIXES.MEALS, roomId];
  if (periodId) parts.push(periodId);
  if (startDate && endDate) parts.push(`${startDate}_${endDate}`);
  return parts.join(':');
}

/**
 * Generate cache key for payments list
 */
export function getPaymentsCacheKey(userId: string, roomId?: string): string {
  const parts = [CACHE_PREFIXES.PAYMENTS, userId];
  if (roomId) parts.push(roomId);
  return parts.join(':');
}

/**
 * Generate cache key for expenses
 */
export function getExpensesCacheKey(roomId: string, periodId?: string): string {
  const parts = [CACHE_PREFIXES.EXPENSES, roomId];
  if (periodId) parts.push(periodId);
  return parts.join(':');
}

/**
 * Generate cache key for shopping items
 */
export function getShoppingCacheKey(roomId: string, periodId?: string): string {
  const parts = [CACHE_PREFIXES.SHOPPING, roomId];
  if (periodId) parts.push(periodId);
  return parts.join(':');
}

/**
 * Generate cache key for user data
 */
export function getUserCacheKey(userId: string): string {
  return `${CACHE_PREFIXES.USERS}:${userId}`;
}

/**
 * Generate cache key for room data
 */
export function getRoomCacheKey(roomId: string): string {
  return `${CACHE_PREFIXES.ROOMS}:${roomId}`;
}

/**
 * Generate cache key for period data
 */
export function getPeriodCacheKey(roomId: string, periodId?: string): string {
  const parts = [CACHE_PREFIXES.PERIODS, roomId];
  if (periodId) parts.push(periodId);
  return parts.join(':');
}

/**
 * Generate pattern for invalidating all keys with a prefix
 */
export function getCachePattern(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts, '*'].join(':');
}

/**
 * Get all cache keys related to a room
 */
export function getRoomRelatedPatterns(roomId: string): string[] {
  return [
    getCachePattern(CACHE_PREFIXES.DASHBOARD, roomId),
    getCachePattern(CACHE_PREFIXES.ANALYTICS, roomId),
    getCachePattern(CACHE_PREFIXES.CALCULATIONS, roomId),
    getCachePattern(CACHE_PREFIXES.MEALS, roomId),
    getCachePattern(CACHE_PREFIXES.EXPENSES, roomId),
    getCachePattern(CACHE_PREFIXES.SHOPPING, roomId),
    getCachePattern(CACHE_PREFIXES.PERIODS, roomId),
  ];
}

/**
 * Get all cache keys related to a user
 */
export function getUserRelatedPatterns(userId: string): string[] {
  return [
    getCachePattern(CACHE_PREFIXES.DASHBOARD, '*', userId),
    getCachePattern(CACHE_PREFIXES.ANALYTICS, '*', userId),
    getCachePattern(CACHE_PREFIXES.PAYMENTS, userId),
    getCachePattern(CACHE_PREFIXES.USERS, userId),
    // Specific pattern for groups list as used in api/groups/route.ts
    // Note: The API uses a hardcoded prefix 'groups_list' instead of CACHE_PREFIXES.GROUPS
    `groups_list:${userId}:*`,
  ];
}
