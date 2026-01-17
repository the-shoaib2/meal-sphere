import prisma from './prisma';
import { cacheGetOrSet } from './cache-service';
import { 
  getCalculationsCacheKey, 
  getMealsCacheKey,
  CACHE_TTL 
} from './cache-keys';

/**
 * Reusable optimized query functions to reduce code duplication
 * and improve performance with caching
 */

/**
 * Get user meal count with caching
 */
export async function getUserMealCount(
  userId: string,
  roomId: string,
  periodId?: string
): Promise<number> {
  const cacheKey = `meal_count:${userId}:${roomId}${periodId ? `:${periodId}` : ''}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const where: any = { userId, roomId };
      if (periodId) where.periodId = periodId;
      
      return await prisma.meal.count({ where });
    },
    { ttl: periodId ? CACHE_TTL.CALCULATIONS_CLOSED : CACHE_TTL.ACTIVE_PERIOD }
  );
}

/**
 * Get room meal count with caching
 */
export async function getRoomMealCount(
  roomId: string,
  periodId?: string
): Promise<number> {
  const cacheKey = `room_meal_count:${roomId}${periodId ? `:${periodId}` : ''}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const where: any = { roomId };
      if (periodId) where.periodId = periodId;
      
      return await prisma.meal.count({ where });
    },
    { ttl: periodId ? CACHE_TTL.CALCULATIONS_CLOSED : CACHE_TTL.ACTIVE_PERIOD }
  );
}

/**
 * Get total expenses for a room with caching
 */
export async function getRoomTotalExpenses(
  roomId: string,
  periodId?: string
): Promise<number> {
  const cacheKey = `room_expenses:${roomId}${periodId ? `:${periodId}` : ''}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const where: any = { roomId };
      if (periodId) where.periodId = periodId;
      
      const result = await prisma.extraExpense.aggregate({
        where,
        _sum: { amount: true },
      });
      
      return result._sum.amount || 0;
    },
    { ttl: periodId ? CACHE_TTL.CALCULATIONS_CLOSED : CACHE_TTL.ACTIVE_PERIOD }
  );
}

/**
 * Calculate meal rate with caching
 */
export async function calculateMealRate(
  roomId: string,
  periodId?: string
): Promise<{ mealRate: number; totalMeals: number; totalExpenses: number }> {
  const cacheKey = getCalculationsCacheKey(roomId, periodId);
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const [totalMeals, totalExpenses] = await Promise.all([
        getRoomMealCount(roomId, periodId),
        getRoomTotalExpenses(roomId, periodId),
      ]);
      
      const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;
      
      return { mealRate, totalMeals, totalExpenses };
    },
    { ttl: periodId ? CACHE_TTL.CALCULATIONS_CLOSED : CACHE_TTL.CALCULATIONS_ACTIVE }
  );
}

/**
 * Get user balance with caching
 */
export async function getUserBalance(
  userId: string,
  roomId: string,
  periodId?: string
): Promise<number> {
  const cacheKey = `user_balance:${userId}:${roomId}${periodId ? `:${periodId}` : ''}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const where: any = { roomId, targetUserId: userId };
      if (periodId) where.periodId = periodId;
      
      const received = await prisma.accountTransaction.aggregate({
        where,
        _sum: { amount: true },
      });
      
      return received._sum.amount || 0;
    },
    { ttl: periodId ? CACHE_TTL.CALCULATIONS_CLOSED : CACHE_TTL.ACTIVE_PERIOD }
  );
}

/**
 * Get current active period for a room with caching
 */
export async function getCurrentPeriod(roomId: string) {
  const cacheKey = `current_period:${roomId}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      return await prisma.mealPeriod.findFirst({
        where: { roomId, status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
      });
    },
    { ttl: CACHE_TTL.ACTIVE_PERIOD }
  );
}

/**
 * Batch get users by IDs (optimized for N+1 prevention)
 */
export async function batchGetUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  
  // Remove duplicates
  const uniqueIds = [...new Set(userIds)];
  
  return await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });
}

/**
 * Get room members with caching
 */
export async function getRoomMembers(roomId: string) {
  const cacheKey = `room_members:${roomId}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      return await prisma.roomMember.findMany({
        where: { roomId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    },
    { ttl: CACHE_TTL.ROOM_INFO }
  );
}

/**
 * Get meals with optimized query (selective fields)
 */
export async function getMealsOptimized(
  roomId: string,
  periodId?: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    limit?: number;
  } = {}
) {
  const where: any = { roomId };
  if (periodId) where.periodId = periodId;
  if (options.userId) where.userId = options.userId;
  if (options.startDate || options.endDate) {
    where.date = {};
    if (options.startDate) where.date.gte = options.startDate;
    if (options.endDate) where.date.lte = options.endDate;
  }
  
  return await prisma.meal.findMany({
    where,
    select: {
      id: true,
      date: true,
      type: true,
      userId: true,
      roomId: true,
      periodId: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { date: 'desc' },
    take: options.limit,
  });
}

/**
 * Get payments with optimized query
 */
export async function getPaymentsOptimized(
  userId: string,
  roomId?: string,
  periodId?: string,
  limit?: number
) {
  const where: any = { userId };
  if (roomId) where.roomId = roomId;
  if (periodId) where.periodId = periodId;
  
  return await prisma.payment.findMany({
    where,
    select: {
      id: true,
      amount: true,
      date: true,
      method: true,
      status: true,
      description: true,
      roomId: true,
      periodId: true,
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

/**
 * Aggregate meals by date range
 */
export async function aggregateMealsByDate(
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string
) {
  const where: any = {
    roomId,
    date: { gte: startDate, lte: endDate },
  };
  if (periodId) where.periodId = periodId;
  
  return await prisma.meal.groupBy({
    by: ['date'],
    where,
    _count: { id: true },
  });
}

/**
 * Aggregate expenses by date range
 */
export async function aggregateExpensesByDate(
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string
) {
  const where: any = {
    roomId,
    date: { gte: startDate, lte: endDate },
  };
  if (periodId) where.periodId = periodId;
  
  return await prisma.extraExpense.groupBy({
    by: ['date'],
    where,
    _sum: { amount: true },
  });
}

/**
 * Get user meal count by date range with caching
 */
export async function getUserMealCountByDateRange(
  userId: string,
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string
): Promise<number> {
  const dateKey = `${startDate.toISOString()}_${endDate.toISOString()}`;
  const cacheKey = `meal_count_range:${userId}:${roomId}:${dateKey}${periodId ? `:${periodId}` : ''}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const where: any = { 
        userId, 
        roomId,
        date: { gte: startDate, lte: endDate }
      };
      if (periodId) where.periodId = periodId;
      
      return await prisma.meal.count({ where });
    },
    { ttl: CACHE_TTL.MEALS_LIST }
  );
}

/**
 * Get room activity summary (aggregated counts)
 */
export async function getRoomActivitySummary(
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string
) {
  const dateKey = `${startDate.toISOString()}_${endDate.toISOString()}`;
  const cacheKey = `activity_summary:${roomId}:${dateKey}${periodId ? `:${periodId}` : ''}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const where: any = { 
        roomId,
        date: { gte: startDate, lte: endDate }
      };
      if (periodId) where.periodId = periodId;

      const [mealCount, paymentCount, expenseCount, shoppingCount] = await Promise.all([
        prisma.meal.count({ where }),
        prisma.payment.count({ where: { ...where, date: { gte: startDate, lte: endDate } } }),
        prisma.extraExpense.count({ where }),
        prisma.shoppingItem.count({ where }),
      ]);

      return {
        mealCount,
        paymentCount,
        expenseCount,
        shoppingCount,
        totalActivities: mealCount + paymentCount + expenseCount + shoppingCount,
      };
    },
    { ttl: CACHE_TTL.ANALYTICS }
  );
}

/**
 * Batch get user balances for multiple users
 */
export async function getBatchUserBalances(
  userIds: string[],
  roomId: string,
  periodId?: string
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(userIds)];
  const where: any = { roomId, targetUserId: { in: uniqueIds } };
  if (periodId) where.periodId = periodId;
  
  const transactions = await prisma.accountTransaction.groupBy({
    by: ['targetUserId'],
    where,
    _sum: { amount: true },
  });
  
  const balanceMap = new Map<string, number>();
  transactions.forEach((t: { targetUserId: string; _sum: { amount: number | null } }) => {
    balanceMap.set(t.targetUserId, t._sum.amount || 0);
  });
  
  // Fill in zeros for users with no transactions
  uniqueIds.forEach(id => {
    if (!balanceMap.has(id)) {
      balanceMap.set(id, 0);
    }
  });
  
  return balanceMap;
}

/**
 * Get recent activities optimized for dashboard
 */
export async function getRecentActivitiesOptimized(
  roomId: string,
  days: number = 7,
  limit: number = 10
) {
  const cacheKey = `recent_activities:${roomId}:${days}:${limit}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Fetch limited data from each source
      const itemsPerSource = Math.ceil(limit / 2); // Get more than needed, then sort
      
      const [meals, payments, expenses, shopping, activities] = await Promise.all([
        prisma.meal.findMany({
          where: { roomId, date: { gte: startDate } },
          select: {
            id: true,
            date: true,
            type: true,
            user: { select: { name: true, image: true } }
          },
          orderBy: { date: 'desc' },
          take: itemsPerSource
        }),
        prisma.payment.findMany({
          where: { roomId, date: { gte: startDate } },
          select: {
            id: true,
            date: true,
            amount: true,
            method: true,
            status: true,
            user: { select: { name: true, image: true } }
          },
          orderBy: { date: 'desc' },
          take: itemsPerSource
        }),
        prisma.extraExpense.findMany({
          where: { roomId, date: { gte: startDate } },
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            type: true,
            user: { select: { name: true, image: true } }
          },
          orderBy: { date: 'desc' },
          take: itemsPerSource
        }),
        prisma.shoppingItem.findMany({
          where: { roomId, date: { gte: startDate } },
          select: {
            id: true,
            name: true,
            date: true,
            purchased: true,
            user: { select: { name: true, image: true } }
          },
          orderBy: { date: 'desc' },
          take: itemsPerSource
        }),
        prisma.groupActivityLog.findMany({
          where: { roomId, createdAt: { gte: startDate } },
          select: {
            id: true,
            type: true,
            createdAt: true,
            user: { select: { name: true, image: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: itemsPerSource
        })
      ]);

      return {
        meals,
        payments,
        expenses,
        shopping,
        activities
      };
    },
    { ttl: CACHE_TTL.DASHBOARD }
  );
}
