import prisma from "./prisma"
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
  const totalCost = expenses.reduce((sum, expense) => sum + expense.amount, 0)

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

  // 1. Fetch Room Totals (Meals, Guest Meals, Expenses)
  const [mealCount, guestMealAgg, expenses, roomMembers] = await Promise.all([
    prisma.meal.count({ where: allMealWhere }),
    prisma.guestMeal.aggregate({
      where: allMealWhere,
      _sum: { count: true },
    }),
    prisma.extraExpense.findMany({
      where: expenseWhere,
      select: { amount: true },
    }),
    prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })
  ]);

  const totalMeals = mealCount + (guestMealAgg._sum.count || 0);
  const totalCost = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0;

  // 2. Bulk Fetch User Stats (Group By User)
  const [userMealCounts, userGuestMealAggs, userPayments] = await Promise.all([
    // Group Meals by User
    prisma.meal.groupBy({
      by: ['userId'],
      where: allMealWhere,
      _count: { id: true },
    }),
    // Group Guest Meals by User
    prisma.guestMeal.groupBy({
      by: ['userId'],
      where: allMealWhere,
      _sum: { count: true },
    }),
    // Group Payments by User
    prisma.payment.groupBy({
      by: ['userId'],
      where: paymentWhereBase,
      _sum: { amount: true },
    })
  ]);

  // 3. Create Lookup Maps for O(1) access
  const mealMap = new Map<string, number>();
  userMealCounts.forEach(item => mealMap.set(item.userId, item._count.id));

  const guestMealMap = new Map<string, number>();
  userGuestMealAggs.forEach(item => guestMealMap.set(item.userId, item._sum.count || 0));

  const paymentMap = new Map<string, number>();
  userPayments.forEach(item => paymentMap.set(item.userId, item._sum.amount || 0));

  // 4. Assemble Results
  const userSummaries: UserMealSummary[] = roomMembers.map(member => {
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
