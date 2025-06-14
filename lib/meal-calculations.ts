import prisma from "./prisma"

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
 * Calculate meal summary for a specific user in a room
 */
export async function calculateUserMealSummary(
  userId: string,
  roomId: string,
  startDate: Date,
  endDate: Date,
): Promise<MealSummary> {
  // Get all meals in the room for the date range
  const allMeals = await prisma.meal.count({
    where: {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Get user's meals for the date range
  const userMeals = await prisma.meal.count({
    where: {
      userId,
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Get total shopping cost for the room in the date range
  const shoppingCosts = await prisma.shoppingItem.findMany({
    where: {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
    },
  })

  const totalCost = shoppingCosts.reduce((sum, item) => sum + item.amount, 0)

  // Calculate meal rate
  const mealRate = allMeals > 0 ? totalCost / allMeals : 0

  // Calculate user cost
  const userCost = mealRate * userMeals

  return {
    totalMeals: allMeals,
    totalCost,
    mealRate,
    userMeals,
    userCost,
    startDate,
    endDate,
  }
}

/**
 * Calculate meal summary for an entire room
 */
export async function calculateRoomMealSummary(
  roomId: string,
  startDate: Date,
  endDate: Date,
): Promise<RoomMealSummary> {
  // Get all meals in the room for the date range
  const allMeals = await prisma.meal.count({
    where: {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Get total shopping cost for the room in the date range
  const shoppingCosts = await prisma.shoppingItem.findMany({
    where: {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
    },
  })

  const totalCost = shoppingCosts.reduce((sum, item) => sum + item.amount, 0)

  // Calculate meal rate
  const mealRate = allMeals > 0 ? totalCost / allMeals : 0

  // Get all room members
  const roomMembers = await prisma.roomMember.findMany({
    where: {
      roomId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  })

  // Calculate meal summary for each user
  const userSummaries: UserMealSummary[] = await Promise.all(
    roomMembers.map(async (member) => {
      // Get user's meals
      const mealCount = await prisma.meal.count({
        where: {
          userId: member.userId,
          roomId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      // Calculate user cost
      const cost = mealRate * mealCount

      // Get user's payments
      const payments = await prisma.payment.findMany({
        where: {
          userId: member.userId,
          roomId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: "COMPLETED",
        },
        select: {
          amount: true,
        },
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
    totalMeals: allMeals,
    totalCost,
    mealRate,
    userSummaries,
    startDate,
    endDate,
  }
}

/**
 * Get the first and last day of the current month
 */
export function getCurrentMonthRange(): { startDate: Date; endDate: Date } {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return { startDate, endDate }
}

/**
 * Format currency in BDT
 */
export function formatCurrency(amount: number): string {
  return `৳${amount.toFixed(2)}`
}
