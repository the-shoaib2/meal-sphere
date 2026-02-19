import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/services/prisma"
import { getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod, getCurrentPeriod, getPeriodForDate } from "@/lib/utils/period-utils"
import { cacheGetOrSet } from "@/lib/cache/cache-service"
import { getMealsCacheKey, CACHE_TTL } from "@/lib/cache/cache-keys"
import { invalidateMealCache } from "@/lib/cache/cache-invalidation"
import { getMealsOptimized } from "@/lib/utils/query-helpers"
import { fetchMealsData } from "@/lib/services/meals-service"

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const periodId = searchParams.get("periodId")
  const dateStr = searchParams.get("date")

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
  }

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check room membership (fast check before heavy lifting)
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: roomId,
        },
      },
      select: { userId: true }
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    // Use unified service to fetch data
    // This leverages the same cache as SSR
    const data = await fetchMealsData(session.user.id, roomId, {
      periodId: periodId || undefined,
      date: dateStr ? new Date(dateStr) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    })

    // Return only what the API client expects (subset of full data)
    return NextResponse.json({
      meals: data.meals,
      period: data.currentPeriod
    })
  } catch (error) {
    console.error("Error fetching meals:", error)
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { roomId, date, type, action } = body

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
    // CRITICAL: Normalize date to start/end of day in UTC to avoid timezone shifts
    // The date string typically comes as YYYY-MM-DD
    const dateObj = new Date(date)
    const startOfDay = new Date(dateObj)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(dateObj)
    endOfDay.setUTCHours(23, 59, 59, 999)

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
    
    let shouldCreate = false;
    if (action === 'add') {
        shouldCreate = true;
    } else if (action === 'remove') {
        shouldCreate = false;
    } else {
        // Legacy toggle behavior
        shouldCreate = deleted.count === 0;
    }

    let result
    if (shouldCreate) {
      // Create meal
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

    // Invalidate cache (await to ensure next fetch gets fresh data)
    await invalidateMealCache(roomId, targetPeriod.id, session.user.id).catch(console.error)

    if (shouldCreate) {
      return NextResponse.json({ ...result, message: "Meal added successfully", deleted: false })
    } else {
      return NextResponse.json({ message: "Meal removed successfully", deleted: true })
    }
  } catch (error) {
    console.error("Error managing meal:", error)
    return NextResponse.json({ error: "Failed to manage meal" }, { status: 500 })
  }
}
