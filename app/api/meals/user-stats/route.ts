import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns'


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const userId = searchParams.get("userId") || session.user.id
  const month = searchParams.get("month") // Format: YYYY-MM
  const periodId = searchParams.get("periodId")

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
    let startDate: Date
    let endDate: Date
    let periodInfo: any = null;

    if (periodId) {
      // Always read the period
      const period = await prisma.mealPeriod.findUnique({
        where: { id: periodId },
      });
      if (!period) {
        return NextResponse.json({ error: "Period not found" }, { status: 404 })
      }
      periodInfo = {
        id: period.id,
        name: period.name,
        startDate: format(period.startDate, 'yyyy-MM-dd'),
        endDate: period.endDate ? format(period.endDate, 'yyyy-MM-dd') : null,
        status: period.status,
      }
      // If period is ENDED, return empty stats
      if (period.status === 'ENDED') {
        return NextResponse.json({
          user: null,
          period: periodInfo,
          totals: { regularMeals: 0, guestMeals: 0, total: 0 },
          byType: {
            breakfast: { regular: 0, guest: 0, total: 0 },
            lunch: { regular: 0, guest: 0, total: 0 },
            dinner: { regular: 0, guest: 0, total: 0 }
          },
          daily: []
        });
      }
      // Use period's date range for all queries
      startDate = period.startDate;
      endDate = period.endDate || new Date();

      // All queries must use periodId and date range
      const userMeals = await prisma.meal.findMany({
        where: {
          roomId,
          userId,
          periodId: period.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      const userGuestMeals = await prisma.guestMeal.findMany({
        where: {
          roomId,
          userId,
          periodId: period.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

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

      // Daily breakdown - OPTIMIZED with Map grouping (O(N) instead of O(N*M))
      const days = eachDayOfInterval({ start: startDate, end: endDate })

      // Group meals by date using Map for O(1) lookup
      const mealsByDate = new Map<string, typeof userMeals>();
      const guestMealsByDate = new Map<string, typeof userGuestMeals>();

      userMeals.forEach(meal => {
        const dayStr = format(new Date(meal.date), 'yyyy-MM-dd');
        if (!mealsByDate.has(dayStr)) mealsByDate.set(dayStr, []);
        mealsByDate.get(dayStr)!.push(meal);
      });

      userGuestMeals.forEach(meal => {
        const dayStr = format(new Date(meal.date), 'yyyy-MM-dd');
        if (!guestMealsByDate.has(dayStr)) guestMealsByDate.set(dayStr, []);
        guestMealsByDate.get(dayStr)!.push(meal);
      });

      const dailyStats = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayMeals = mealsByDate.get(dayStr) || [];
        const dayGuestMeals = guestMealsByDate.get(dayStr) || [];

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
        period: periodInfo,
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
    } else if (month) {
      // Only use month-based logic if NO periodId is provided
      const [year, monthNum] = month.split('-').map(Number)
      startDate = startOfMonth(new Date(year, monthNum - 1, 1))
      endDate = endOfMonth(new Date(year, monthNum - 1, 1))
    } else {
      // Default to current month only if no periodId and no month specified
      startDate = startOfMonth(new Date())
      endDate = endOfMonth(new Date())
    }

    // Get user's meals for the range
    const userMeals = await prisma.meal.findMany({
      where: {
        roomId: roomId,
        userId: userId,
        ...(periodId ? { periodId: periodId } : {}), // Use periodId if available
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Get user's guest meals for the range
    const userGuestMeals = await prisma.guestMeal.findMany({
      where: {
        roomId: roomId,
        userId: userId,
        ...(periodId ? { periodId: periodId } : {}), // Use periodId if available
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

    // Daily breakdown - OPTIMIZED with Map grouping (O(N) instead of O(N*M))
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Group meals by date using Map for O(1) lookup
    const mealsByDate = new Map<string, typeof userMeals>();
    const guestMealsByDate = new Map<string, typeof userGuestMeals>();

    userMeals.forEach(meal => {
      const dayStr = format(new Date(meal.date), 'yyyy-MM-dd');
      if (!mealsByDate.has(dayStr)) mealsByDate.set(dayStr, []);
      mealsByDate.get(dayStr)!.push(meal);
    });

    userGuestMeals.forEach(meal => {
      const dayStr = format(new Date(meal.date), 'yyyy-MM-dd');
      if (!guestMealsByDate.has(dayStr)) guestMealsByDate.set(dayStr, []);
      guestMealsByDate.get(dayStr)!.push(meal);
    });

    const dailyStats = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayMeals = mealsByDate.get(dayStr) || [];
      const dayGuestMeals = guestMealsByDate.get(dayStr) || [];

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
      period: periodInfo || {
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

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error("Error fetching user meal stats:", error)
    return NextResponse.json({ error: "Failed to fetch user meal statistics" }, { status: 500 })
  }
} 
