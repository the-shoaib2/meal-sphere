"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { generateMealCountData, generateExpenseData, generateMealRateTrendData, generateMonthlyExpenseData } from "@/lib/utils/chart-utils";
import { cacheGetOrSet } from "@/lib/cache/cache-service";
import { getAnalyticsCacheKey, CACHE_TTL } from "@/lib/cache/cache-keys";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (!session?.user?.email) throw new Error("Unauthorized");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");
    return user.id;
  }
  return session.user.id;
}

export async function getAnalyticsAction(groupId?: string | null) {
  try {
    const userId = await getUserId();
    const cacheKey = getAnalyticsCacheKey(groupId || "all", userId);

    return await cacheGetOrSet(
      cacheKey,
      async () => await fetchAnalyticsData(userId, groupId || null),
      { ttl: CACHE_TTL.ANALYTICS }
    );
  } catch (error: any) {
    console.error("Error in getAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch analytics");
  }
}

export async function getUserRoomsAction() {
  try {
    const userId = await getUserId();

    const userWithRooms = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rooms: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: { members: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRooms) throw new Error("User not found");

    return userWithRooms.rooms.map((membership) => ({
      id: membership.room.id,
      name: membership.room.name,
      memberCount: membership.room._count.members,
    }));
  } catch (error: any) {
    console.error("Error in getUserRoomsAction:", error);
    throw new Error(error.message || "Failed to fetch user rooms");
  }
}

export async function getSelectedRoomsAnalyticsAction(roomIdsStr: string) {
  try {
    const userId = await getUserId();
    if (!roomIdsStr) throw new Error("Room IDs are required");
    
    const requestRoomIds = roomIdsStr.split(',').filter(id => id.trim() !== '');
    if (requestRoomIds.length === 0) throw new Error("No valid room IDs provided");

    // Verify user belongs to these rooms
    const memberships = await prisma.roomMember.findMany({
      where: {
        userId,
        roomId: { in: requestRoomIds }
      },
      select: { roomId: true }
    });

    const validRoomIds = memberships.map(m => m.roomId);
    if (validRoomIds.length === 0) {
      throw new Error("You are not a member of the selected rooms");
    }

    return await fetchAnalyticsDataForRooms(userId, validRoomIds);
  } catch (error: any) {
    console.error("Error in getSelectedRoomsAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch selected rooms analytics");
  }
}

export async function getRoomAnalyticsAction(roomId: string) {
  try {
    const userId = await getUserId();
    if (!roomId) throw new Error("Room ID is required");

    return await fetchAnalyticsData(userId, roomId);
  } catch (error: any) {
    console.error("Error in getRoomAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch room analytics");
  }
}

export async function getAllRoomsAnalyticsAction() {
  try {
    const userId = await getUserId();
    return await fetchAnalyticsData(userId, null);
  } catch (error: any) {
    console.error("Error in getAllRoomsAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch all rooms analytics");
  }
}

// ----------------------------------------------------
// Internal Helpers below
// ----------------------------------------------------

async function fetchAnalyticsDataForRooms(userId: string, validRoomIds: string[]) {
  // Fetch valid rooms to ensure they exist and get names
  const validRooms = await prisma.room.findMany({
    where: { id: { in: validRoomIds } },
    select: { id: true, name: true }
  });

  if (validRoomIds.length === 0) {
    return getEmptyAnalytics();
  }

  return await executeOptimizedAnalyticsQuery(validRoomIds, validRooms);
}

async function fetchAnalyticsData(userId: string, groupId: string | null) {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    select: { roomId: true }
  });

  if (!memberships) throw new Error('User not found');

  let roomIds = memberships.map((m) => m.roomId);

  const validRooms = await prisma.room.findMany({
    where: { id: { in: roomIds } },
    select: { id: true, name: true }
  });

  roomIds = validRooms.map(r => r.id);

  if (groupId && groupId !== 'all') {
    if (!roomIds.includes(groupId)) throw new Error('Not a member of this group');
    roomIds = [groupId];
  }

  if (roomIds.length === 0) return getEmptyAnalytics();

  return await executeOptimizedAnalyticsQuery(roomIds, validRooms);
}

function getEmptyAnalytics() {
  return {
    meals: [],
    expenses: [],
    shoppingItems: [],
    calculations: [],
    mealDistribution: [],
    expenseDistribution: [],
    monthlyExpenses: [],
    mealRateTrend: [],
    roomStats: []
  };
}

// The core engine for calculating analytics data
async function executeOptimizedAnalyticsQuery(roomIds: string[], validRooms: any[]) {
    // 1. Batch fetch active periods
    const activePeriods = await prisma.mealPeriod.findMany({
        where: { roomId: { in: roomIds }, status: 'ACTIVE' },
        select: { id: true, roomId: true, startDate: true, endDate: true }
    });

    const activePeriodIds = activePeriods.map(p => p.id);
    const periodMap = new Map<string, typeof activePeriods[0]>();
    activePeriods.forEach(p => periodMap.set(p.roomId, p));

    // 2. Batch fetch data only for active periods
    const [meals, expenses, shoppingItems, roomMembers] = await Promise.all([
        activePeriodIds.length > 0 ? prisma.meal.findMany({
            where: { periodId: { in: activePeriodIds } },
            select: {
                id: true, date: true, type: true, roomId: true, userId: true,
                room: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } }
            },
            orderBy: { date: 'desc' }
        }) : Promise.resolve([]),

        activePeriodIds.length > 0 ? prisma.extraExpense.findMany({
            where: { periodId: { in: activePeriodIds } },
            select: {
                id: true, amount: true, date: true, type: true, roomId: true, description: true,
                room: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } }
            },
            orderBy: { date: 'desc' }
        }) : Promise.resolve([]),

        activePeriodIds.length > 0 ? prisma.shoppingItem.findMany({
            where: { periodId: { in: activePeriodIds } },
            select: {
                id: true, name: true, quantity: true, date: true, roomId: true, purchased: true,
                room: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } }
            },
            orderBy: { date: 'desc' }
        }) : Promise.resolve([]),

        prisma.roomMember.groupBy({
            by: ['roomId'],
            where: { roomId: { in: roomIds } },
            _count: { userId: true }
        })
    ]);

    const memberCounts = roomMembers.reduce((acc, curr) => {
        acc[curr.roomId] = curr._count.userId;
        return acc;
    }, {} as Record<string, number>);

    // 3. Perform calculations in memory
    const calculations = roomIds.map((roomId) => {
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
            const dates = [...roomMeals, ...roomExpenses, ...roomShopping].map(item => item.date);
            startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
            endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
        }

        const roomName = validRooms.find(r => r.id === roomId)?.name || 'Unknown Room';

        return {
            id: roomId,
            roomId,
            roomName,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalMeals,
            totalExpense,
            mealRate,
            memberCount: memberCounts[roomId] || 0,
        };
    });

    return {
        meals,
        expenses,
        shoppingItems,
        calculations,
        mealDistribution: generateMealCountData(meals),
        expenseDistribution: generateExpenseData(expenses, shoppingItems),
        monthlyExpenses: generateMonthlyExpenseData(expenses, shoppingItems),
        mealRateTrend: generateMealRateTrendData(calculations),
        roomStats: calculations.map(calc => {
            const start = new Date(calc.startDate);
            const end = new Date(calc.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            return {
                roomId: calc.roomId,
                roomName: calc.roomName,
                totalMeals: calc.totalMeals,
                totalExpenses: calc.totalExpense,
                averageMealRate: calc.mealRate,
                memberCount: calc.memberCount,
                activeDays: Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1,
            };
        })
    };
}
