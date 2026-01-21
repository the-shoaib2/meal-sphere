import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { 
  generateMealCountData, 
  generateExpenseData, 
  generateMealRateTrendData, 
  generateMonthlyExpenseData 
} from '@/lib/utils/chart-utils';

export interface AnalyticsData {
  meals: any[];
  expenses: any[];
  shoppingItems: any[];
  calculations: any[];
  mealDistribution: any[];
  expenseDistribution: any[];
  monthlyExpenses: any[];
  mealRateTrend: any[];
  roomStats: any[];
  error?: string;
  unauthorizedRooms?: string[];
}

/**
 * Fetch analytics data for a user.
 * Can filter by specific groupId, or a list of roomIds.
 * If neither provided, fetches for all user's rooms.
 * ALWAYS optimizes by fetching only ACTIVE period data.
 */
export async function fetchAnalyticsData(
  userId: string, 
  options: {
    groupId?: string | null;
    roomIds?: string[];
  } = {}
) {
  const { groupId, roomIds: requestedRoomIds } = options;
  
  // Construct cache key based on params
  const roomKey = requestedRoomIds ? requestedRoomIds.sort().join(',') : (groupId || 'all');
  const cacheKey = `analytics-service-${userId}-${roomKey}`;

  const cachedFn = unstable_cache(
    async () => {
      // 1. Get user's *actual* memberships to validate access
      const memberships = await prisma.roomMember.findMany({
        where: { userId },
        select: { roomId: true }
      });
      
      const userRoomIds = memberships.map(m => m.roomId);
      
      let targetRoomIds: string[] = [];

      // Logic to determine targetRoomIds
      if (requestedRoomIds && requestedRoomIds.length > 0) {
        // Validate specifically requested rooms
        const unauthorized = requestedRoomIds.filter(id => !userRoomIds.includes(id));
        if (unauthorized.length > 0) {
           return encryptData({ error: 'Unauthorized for some rooms', unauthorizedRooms: unauthorized });
        }
        targetRoomIds = requestedRoomIds;
      } else if (groupId && groupId !== 'all') {
        // Validate single group
        if (!userRoomIds.includes(groupId)) {
           return encryptData({ error: 'Not a member of this group' });
        }
        targetRoomIds = [groupId];
      } else {
        // All rooms
        targetRoomIds = userRoomIds;
      }

      if (targetRoomIds.length === 0) {
        return encryptData(getEmptyAnalytics());
      }

      // 2. Fetch valid rooms (for names)
      const validRooms = await prisma.room.findMany({
        where: { id: { in: targetRoomIds } },
        select: { id: true, name: true }
      });
      
      const validRoomIds = validRooms.map(r => r.id);

      // 3. Batch fetch ACTIVE periods
      const activePeriods = await prisma.mealPeriod.findMany({
        where: {
          roomId: { in: validRoomIds },
          status: 'ACTIVE'
        },
        select: { id: true, roomId: true, startDate: true, endDate: true }
      });

      const activePeriodIds = activePeriods.map(p => p.id);
      const periodMap = new Map<string, typeof activePeriods[0]>();
      activePeriods.forEach(p => periodMap.set(p.roomId, p));

      // If no active periods, return mainly empty but with room list
      if (activePeriodIds.length === 0) {
         // Should we return empty? Or just room stats with 0?
         // Let's return empty stats but valid structure
         return encryptData(getEmptyAnalytics(validRooms));
      }

      // 4. Batch fetch Data (Meals, Expenses, Shopping)
      const [meals, expenses, shoppingItems, roomMembers] = await Promise.all([
        prisma.meal.findMany({
          where: { 
             roomId: { in: validRoomIds },
             periodId: { in: activePeriodIds } 
          },
          include: {
            room: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          orderBy: { date: 'desc' }
        }),
        prisma.extraExpense.findMany({
          where: { 
             roomId: { in: validRoomIds },
             periodId: { in: activePeriodIds }
          },
          include: {
            room: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          orderBy: { date: 'desc' }
        }),
        prisma.shoppingItem.findMany({
          where: { 
             roomId: { in: validRoomIds },
             periodId: { in: activePeriodIds }
          },
          include: {
            room: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } }
          },
          orderBy: { date: 'desc' }
        }),
        prisma.roomMember.groupBy({
          by: ['roomId'],
          where: { roomId: { in: validRoomIds } },
          _count: { userId: true }
        })
      ]);

      const memberCounts = roomMembers.reduce((acc, curr) => {
        acc[curr.roomId] = curr._count.userId;
        return acc;
      }, {} as Record<string, number>);

      // 5. Calculations
      const calculations = validRoomIds.map((roomId) => {
        const roomMeals = meals.filter(m => m.roomId === roomId);
        const roomExpenses = expenses.filter(e => e.roomId === roomId);
        const roomShopping = shoppingItems.filter(s => s.roomId === roomId);

        const totalMeals = roomMeals.length;
        const totalExpense = roomExpenses.reduce((sum, e) => sum + e.amount, 0) +
          roomShopping.reduce((sum, s) => sum + (s.quantity || 0), 0);

        const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;

        const period = periodMap.get(roomId);
        let startDate: Date, endDate: Date;

        if (period) {
          startDate = new Date(period.startDate);
          endDate = period.endDate ? new Date(period.endDate) : new Date();
        } else {
           // Fallback inferred
           const dates = [...roomMeals, ...roomExpenses, ...roomShopping].map(item => item.date);
           startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
           endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
        }

        return {
          id: roomId,
          roomId,
          roomName: validRooms.find(r => r.id === roomId)?.name || 'Unknown Room',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalMeals,
          totalExpense,
          mealRate,
          memberCount: memberCounts[roomId] || 0,
        };
      });

      // 6. Generate Charts
      const mealDistribution = generateMealCountData(meals);
      const expenseDistribution = generateExpenseData(expenses, shoppingItems);
      const mealRateTrend = generateMealRateTrendData(calculations);
      const monthlyExpenses = generateMonthlyExpenseData(expenses, shoppingItems);

      const roomStats = calculations.map(calc => {
         const roomMeals = meals.filter(meal => meal.roomId === calc.roomId);
         const activeDays = new Set(roomMeals.map(meal => meal.date.toDateString())).size;
         return {
           roomId: calc.roomId,
           roomName: calc.roomName,
           totalMeals: calc.totalMeals,
           totalExpenses: calc.totalExpense,
           averageMealRate: calc.mealRate,
           memberCount: calc.memberCount,
           activeDays
         };
      });

      const result: AnalyticsData = {
        meals,
        expenses,
        shoppingItems,
        calculations,
        mealDistribution,
        expenseDistribution,
        monthlyExpenses,
        mealRateTrend,
        roomStats
      };

      return encryptData(result);
    },
    [cacheKey, 'analytics-data'],
    {
      revalidate: 300, // 5 minutes
      tags: [`user-${userId}`, 'analytics']
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetch just the list of rooms a user is in, with member counts
 */
export async function fetchUserRoomsList(userId: string) {
  const cacheKey = `analytics-user-rooms-${userId}`;
  
  const cachedFn = unstable_cache(
      async () => {
          const memberships = await prisma.roomMember.findMany({
              where: { userId },
              select: { roomId: true }
          });
          
          if (memberships.length === 0) return encryptData([]);
          
          const roomIds = memberships.map(m => m.roomId);
          const validRooms = await prisma.room.findMany({
              where: { id: { in: roomIds } },
              select: { id: true, name: true }
          });
          
          const validRoomIds = validRooms.map(r => r.id);
          
          const roomMembers = await prisma.roomMember.groupBy({
              by: ['roomId'],
              where: { roomId: { in: validRoomIds } },
              _count: { userId: true }
          });
          
          const memberCounts = roomMembers.reduce((acc, curr) => {
             acc[curr.roomId] = curr._count.userId;
             return acc;
          }, {} as Record<string, number>);
          
          const result = validRooms.map(r => ({
              id: r.id,
              name: r.name || 'Unknown Room',
              memberCount: memberCounts[r.id] || 0
          }));
          
          return encryptData(result);
      },
      [cacheKey, 'analytics-user-rooms'],
      { revalidate: 300, tags: [`user-${userId}`, 'user-rooms'] }
  );
  
  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

function getEmptyAnalytics(validRooms: {id: string, name: string | null}[] = []) {
  return {
    meals: [],
    expenses: [],
    shoppingItems: [],
    calculations: validRooms.map(r => ({
        id: r.id,
        roomId: r.id,
        roomName: r.name || 'Unknown',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        totalMeals: 0,
        totalExpense: 0,
        mealRate: 0,
        memberCount: 0
    })),
    mealDistribution: [],
    expenseDistribution: [],
    monthlyExpenses: [],
    mealRateTrend: [],
    roomStats: []
  };
}
