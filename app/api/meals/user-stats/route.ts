import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const userId = searchParams.get("userId") || session.user.id
  const month = searchParams.get("month") // Format: YYYY-MM

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
  }

  // Check if user is a member of the room
  const roomMember = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId: session.user.id,
        roomId: roomId,
      },
    },
  })

  if (!roomMember) {
    return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
  }

  try {
    // Get date range for the month
    let startDate: Date
    let endDate: Date
    
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      startDate = startOfMonth(new Date(year, monthNum - 1, 1))
      endDate = endOfMonth(new Date(year, monthNum - 1, 1))
    } else {
      // Default to current month
      startDate = startOfMonth(new Date())
      endDate = endOfMonth(new Date())
    }

    // Get user's meals for the month
    const userMeals = await prisma.meal.findMany({
      where: {
        roomId: roomId,
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Get user's guest meals for the month
    const userGuestMeals = await prisma.guestMeal.findMany({
      where: {
        roomId: roomId,
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Calculate statistics
    const totalRegularMeals = userMeals.length
    const totalGuestMeals = userGuestMeals.reduce((sum, meal) => sum + meal.count, 0)
    const totalMeals = totalRegularMeals + totalGuestMeals

    // Count by meal type
    const breakfastCount = userMeals.filter(meal => meal.type === 'BREAKFAST').length
    const lunchCount = userMeals.filter(meal => meal.type === 'LUNCH').length
    const dinnerCount = userMeals.filter(meal => meal.type === 'DINNER').length

    // Guest meals by type
    const guestBreakfastCount = userGuestMeals
      .filter(meal => meal.type === 'BREAKFAST')
      .reduce((sum, meal) => sum + meal.count, 0)
    const guestLunchCount = userGuestMeals
      .filter(meal => meal.type === 'LUNCH')
      .reduce((sum, meal) => sum + meal.count, 0)
    const guestDinnerCount = userGuestMeals
      .filter(meal => meal.type === 'DINNER')
      .reduce((sum, meal) => sum + meal.count, 0)

    // Daily breakdown
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const dailyStats = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayMeals = userMeals.filter(meal => 
        format(new Date(meal.date), 'yyyy-MM-dd') === dayStr
      )
      const dayGuestMeals = userGuestMeals.filter(meal => 
        format(new Date(meal.date), 'yyyy-MM-dd') === dayStr
      )
      
      return {
        date: dayStr,
        breakfast: dayMeals.filter(meal => meal.type === 'BREAKFAST').length,
        lunch: dayMeals.filter(meal => meal.type === 'LUNCH').length,
        dinner: dayMeals.filter(meal => meal.type === 'DINNER').length,
        guestBreakfast: dayGuestMeals
          .filter(meal => meal.type === 'BREAKFAST')
          .reduce((sum, meal) => sum + meal.count, 0),
        guestLunch: dayGuestMeals
          .filter(meal => meal.type === 'LUNCH')
          .reduce((sum, meal) => sum + meal.count, 0),
        guestDinner: dayGuestMeals
          .filter(meal => meal.type === 'DINNER')
          .reduce((sum, meal) => sum + meal.count, 0),
        total: dayMeals.length + dayGuestMeals.reduce((sum, meal) => sum + meal.count, 0),
      }
    })

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
      },
    })

    const stats = {
      user,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        month: format(startDate, 'yyyy-MM'),
      },
      totals: {
        regularMeals: totalRegularMeals,
        guestMeals: totalGuestMeals,
        total: totalMeals,
      },
      byType: {
        breakfast: {
          regular: breakfastCount,
          guest: guestBreakfastCount,
          total: breakfastCount + guestBreakfastCount,
        },
        lunch: {
          regular: lunchCount,
          guest: guestLunchCount,
          total: lunchCount + guestLunchCount,
        },
        dinner: {
          regular: dinnerCount,
          guest: guestDinnerCount,
          total: dinnerCount + guestDinnerCount,
        },
      },
      daily: dailyStats,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching user meal stats:", error)
    return NextResponse.json({ error: "Failed to fetch user meal statistics" }, { status: 500 })
  }
} 