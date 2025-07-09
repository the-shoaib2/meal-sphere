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
export async function calculateRoomMealSummary(
  roomId: string,
  startDate: Date,
  endDate: Date,
  periodId?: string,
): Promise<RoomMealSummary> {
  // Use periodId for all queries if provided
  const allMealWhere = periodId ? { roomId, periodId } : { roomId, date: { gte: startDate, lte: endDate } }
  const expenseWhere = periodId ? { roomId, periodId } : { roomId, date: { gte: startDate, lte: endDate } }

  // Get all meals (including guest meals) in the room for the period
  const mealCount = await prisma.meal.count({ where: allMealWhere })
  const guestMealCount = await prisma.guestMeal.aggregate({
    where: allMealWhere,
    _sum: { count: true },
  })
  const totalMeals = mealCount + (guestMealCount._sum.count || 0)

  // Get total expenses for the room in the period
  const expenses = await prisma.extraExpense.findMany({
    where: expenseWhere,
    select: { amount: true },
  })
  const totalCost = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Calculate meal rate
  const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0

  // Get all room members
  const roomMembers = await prisma.roomMember.findMany({
    where: { roomId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  // Calculate meal summary for each user
  const userSummaries: UserMealSummary[] = await Promise.all(
    roomMembers.map(async (member) => {
      // Get user's meals (including guest meals)
      const mealWhere = periodId ? { roomId, userId: member.userId, periodId } : { roomId, userId: member.userId, date: { gte: startDate, lte: endDate } }
      const userMealCount = await prisma.meal.count({ where: mealWhere })
      const userGuestMealCount = await prisma.guestMeal.aggregate({
        where: mealWhere,
        _sum: { count: true },
      })
      const mealCount = userMealCount + (userGuestMealCount._sum.count || 0)

      // Calculate user cost
      const cost = mealRate * mealCount

      // Get user's payments
      const paymentWhere = periodId
        ? { userId: member.userId, roomId, periodId, status: PaymentStatus.COMPLETED }
        : { userId: member.userId, roomId, date: { gte: startDate, lte: endDate }, status: PaymentStatus.COMPLETED }
      const payments = await prisma.payment.findMany({
        where: paymentWhere,
        select: { amount: true },
      })
      const paid = payments.reduce((sum, payment) => sum + payment.amount, 0)

      // Calculate balance
      const balance = paid - cost

      return {
        userId: member.userId,
        userName: member.user.name,
        userImage: member.user.image || undefined,
        mealCount,
        cost,
        paid,
        balance,
      }
    }),
  )

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
