import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/services/prisma"
import { getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod, getCurrentPeriod, getPeriodForDate } from "@/lib/utils/period-utils"
import { cacheGetOrSet } from "@/lib/cache/cache-service"
import { getMealsCacheKey, CACHE_TTL } from "@/lib/cache/cache-keys"
import { invalidateMealCache } from "@/lib/cache/cache-invalidation"
import { getMealsOptimized } from "@/lib/utils/query-helpers"

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
  }

  try {
    // Parallel auth checks for faster response
    const [session, currentPeriodData] = await Promise.all([
      getServerSession(authOptions),
      getCurrentPeriod(roomId)
    ])

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check room membership
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: roomId,
        },
      },
      select: { userId: true } // Only select what we need
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    // Resolve target period (override if date or periodId provided)
    const queryPeriodId = searchParams.get('periodId')
    const queryDate = searchParams.get('date')
    
    let targetPeriod = currentPeriodData
    if (queryPeriodId) {
      targetPeriod = await prisma.mealPeriod.findUnique({ where: { id: queryPeriodId } })
    } else if (queryDate) {
      targetPeriod = await getPeriodForDate(roomId, new Date(queryDate))
    }

    // If no period found, return empty array immediately
    if (!targetPeriod) {
      return NextResponse.json([])
    }

    // Generate cache key
    const periodId = targetPeriod.id
    const cacheKey = getMealsCacheKey(roomId, periodId, startDate || undefined, endDate || undefined)

    // Try to get from cache or fetch fresh data
    const meals = await cacheGetOrSet(
      cacheKey,
      async () => {
        // Build optimized where clause
        const whereClause: any = {
          roomId,
          periodId
        }

        // Add date filter if provided
        if (startDate || endDate) {
          whereClause.date = {}
          if (startDate) whereClause.date.gte = new Date(startDate)
          if (endDate) whereClause.date.lte = new Date(endDate)
        }

        // Optimized query with select to reduce data transfer
        return await prisma.meal.findMany({
          where: whereClause,
          select: {
            id: true,
            date: true,
            type: true,
            userId: true,
            roomId: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        })
      },
      { ttl: CACHE_TTL.MEALS_LIST }
    )

    // Return with proper caching
    return NextResponse.json({
      meals,
      period: targetPeriod
    })
  } catch (error) {
    console.error("Error fetching meals:", error)
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { roomId, date, type } = body

    if (!roomId || !date || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Parallel auth and validation checks
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [targetPeriod, roomMember] = await Promise.all([
      getPeriodForDate(roomId, new Date(date)),
      prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: roomId,
          },
        },
        select: { userId: true }
      })
    ])

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    if (!targetPeriod) {
      return NextResponse.json({ error: "No period found for this date. Please ensure a period covers this date." }, { status: 400 })
    }

    if (targetPeriod.isLocked) {
      return NextResponse.json({ error: "This period is locked" }, { status: 400 })
    }

    // Use deleteMany + create pattern for faster toggle (single round trip)
    // CRITICAL: Normalize date to start/end of day to be robust against legacy timestamps
    const dateObj = new Date(date)
    const startOfDay = new Date(dateObj)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(dateObj)
    endOfDay.setHours(23, 59, 59, 999)

    const deleted = await prisma.meal.deleteMany({
      where: {
        userId: session.user.id,
        roomId: roomId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        type: type,
        // We don't filter by periodId here to ensure we clean up any legacy records 
        // that might be associated with the wrong period but same date
      },
    })
    
    let result
    if (deleted.count === 0) {
      // Meal didn't exist, create it
      result = await prisma.meal.create({
        data: {
          userId: session.user.id,
          roomId: roomId,
          date: startOfDay,
          type: type,
          periodId: targetPeriod.id,
        },
        select: {
          id: true,
          date: true,
          type: true,
          userId: true,
          roomId: true,
        }
      })
    }

    // Invalidate cache (async, don't wait)
    invalidateMealCache(roomId, targetPeriod.id).catch(console.error)

    return NextResponse.json(
      deleted.count > 0 
        ? { message: "Meal removed successfully", deleted: true }
        : { ...result, deleted: false }
    )
  } catch (error) {
    console.error("Error managing meal:", error)
    return NextResponse.json({ error: "Failed to manage meal" }, { status: 500 })
  }
}
