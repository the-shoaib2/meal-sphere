import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/services/prisma"
import { getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod, getCurrentPeriod } from "@/lib/utils/period-utils"
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
    const [session, currentPeriod] = await Promise.all([
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

    // If no active period, return empty array immediately
    if (!currentPeriod) {
      return NextResponse.json([])
    }

    // Generate cache key
    const periodId = currentPeriod.id
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

    // Return with proper caching (remove conflicting headers)
    return NextResponse.json(meals)
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

    const [currentPeriod, roomMember] = await Promise.all([
      getCurrentPeriod(roomId),
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

    if (!currentPeriod) {
      return NextResponse.json({ error: "No active period found" }, { status: 400 })
    }

    if (currentPeriod.isLocked) {
      return NextResponse.json({ error: "This period is locked" }, { status: 400 })
    }

    // Use deleteMany + create pattern for faster toggle (single round trip)
    const dateObj = new Date(date)
    const deleted = await prisma.meal.deleteMany({
      where: {
        userId: session.user.id,
        roomId: roomId,
        date: dateObj,
        type: type,
        periodId: currentPeriod.id,
      },
    })

    let result
    if (deleted.count === 0) {
      // Meal didn't exist, create it
      result = await prisma.meal.create({
        data: {
          userId: session.user.id,
          roomId: roomId,
          date: dateObj,
          type: type,
          periodId: currentPeriod.id,
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
    invalidateMealCache(roomId, currentPeriod.id).catch(console.error)

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
