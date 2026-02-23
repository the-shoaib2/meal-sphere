import prisma from "./services/prisma"
import { PaymentStatus } from "@prisma/client"

export type MealSummary = {
  totalMeals: number
  totalCost: number
  mealRate: number
  userMeals: number
  userCost: number
  startDate: Date
  endDate: Date
}

export type UserMealSummary = {
  userId: string
  userName: string
  userImage?: string
  mealCount: number
  cost: number
  paid: number
  balance: number
}

export type RoomMealSummary = {
  totalMeals: number
  totalCost: number
  mealRate: number
  userSummaries: UserMealSummary[]
  startDate: Date
  endDate: Date
}

/**
 * Calculate meal summary for a specific user in a room and period
 */
export async function calculateUserMealSummary(
  userId: string,
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string,
): Promise<MealSummary> {
  // Use periodId for all queries if provided
  const mealWhere = periodId ? { roomId, userId, periodId } : { roomId, userId, date: { gte: startDate, lte: endDate } }
  const allMealWhere = periodId ? { roomId, periodId } : { roomId, date: { gte: startDate, lte: endDate } }
  const expenseWhere = periodId ? { roomId, periodId } : { roomId, date: { gte: startDate, lte: endDate } }

  // Get all meals (including guest meals) in the room for the period
  const mealCount = await prisma.meal.count({ where: allMealWhere })
  const guestMealCount = await prisma.guestMeal.aggregate({
    where: allMealWhere,
    _sum: { count: true },
  })
  const totalMeals = mealCount + (guestMealCount._sum.count || 0)

  // Get user's meals (including guest meals)
  const userMealCount = await prisma.meal.count({ where: mealWhere })
  const userGuestMealCount = await prisma.guestMeal.aggregate({
    where: mealWhere,
    _sum: { count: true },
  })
  const userMeals = userMealCount + (userGuestMealCount._sum.count || 0)

  // Get total expenses for the room in the period
  const expenses = await prisma.extraExpense.findMany({
    where: expenseWhere,
    select: { amount: true },
  })
  const totalCost = expenses.reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0)

  // Calculate meal rate
  const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0

  // Calculate user cost
  const userCost = mealRate * userMeals

  return {
    totalMeals,
    totalCost,
    mealRate,
    userMeals,
    userCost,
    startDate,
    endDate,
  }
}

/**
 * Calculate meal summary for an entire room and period
 */
/**
 * Calculate meal summary for an entire room and period
 */
export async function calculateRoomMealSummary(
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string,
): Promise<RoomMealSummary> {
  // Use periodId for all queries if provided
  const allMealWhere = periodId ? { roomId, periodId } : { roomId, date: { gte: startDate, lte: endDate } }
  const expenseWhere = periodId ? { roomId, periodId } : { roomId, date: { gte: startDate, lte: endDate } }
  const paymentWhereBase = periodId
    ? { roomId, periodId, status: PaymentStatus.COMPLETED }
    : { roomId, date: { gte: startDate, lte: endDate }, status: PaymentStatus.COMPLETED };

  // 1. Fetch Room Totals & User Aggregations in two major parallel blocks
  const [
    roomStats,
    userAggregations,
    roomMembers
  ] = await Promise.all([
    // Block 1: Room-wide totals
    Promise.all([
      prisma.meal.count({ where: allMealWhere }),
      prisma.guestMeal.aggregate({
        where: allMealWhere,
        _sum: { count: true },
      }),
      prisma.extraExpense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      })
    ]),
    // Block 2: User-specific aggregations
    Promise.all([
      prisma.meal.groupBy({
        by: ['userId'],
        where: allMealWhere,
        _count: { id: true },
      }),
      prisma.guestMeal.groupBy({
        by: ['userId'],
        where: allMealWhere,
        _sum: { count: true },
      }),
      prisma.payment.groupBy({
        by: ['userId'],
        where: paymentWhereBase,
        _sum: { amount: true },
      })
    ]),
    // Block 3: Members info
    prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })
  ]);

  const [mealCount, guestMealAgg, expenseAgg] = roomStats;
  const [userMealCounts, userGuestMealAggs, userPayments] = userAggregations;

  const totalMeals = mealCount + (guestMealAgg._sum.count || 0);
  const totalCost = expenseAgg._sum.amount || 0;
  const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0;

  // 3. Create Lookup Maps for O(1) access
  const mealMap = new Map<string, number>();
  userMealCounts.forEach((item: { userId: string, _count: { id: number } }) => mealMap.set(item.userId, item._count.id));

  const guestMealMap = new Map<string, number>();
  userGuestMealAggs.forEach((item: { userId: string, _sum: { count: number | null } }) => guestMealMap.set(item.userId, item._sum.count || 0));

  const paymentMap = new Map<string, number>();
  userPayments.forEach((item: { userId: string, _sum: { amount: number | null } }) => paymentMap.set(item.userId, item._sum.amount || 0));

  // 4. Assemble Results
  const userSummaries: UserMealSummary[] = roomMembers.map((member: { userId: string; user: { name: string; image: string | null } }) => {
    const userId = member.userId;
    const userMeals = (mealMap.get(userId) || 0) + (guestMealMap.get(userId) || 0);
    const cost = mealRate * userMeals;
    const paid = paymentMap.get(userId) || 0;
    const balance = paid - cost;

    return {
      userId,
      userName: member.user.name,
      userImage: member.user.image || undefined,
      mealCount: userMeals,
      cost,
      paid,
      balance,
    };
  });

  return {
    totalMeals,
    totalCost,
    mealRate,
    userSummaries,
    startDate,
    endDate,
  }
}

export function getCurrentMonthRange(): { startDate: Date; endDate: Date } {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { startDate, endDate }
}

export function formatCurrency(amount: number): string {
  return `৳${amount.toFixed(2)}`
}
