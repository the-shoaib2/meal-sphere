import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { calculateRoomMealSummary, calculateUserMealSummary, getCurrentMonthRange } from "@/lib/meal-calculations"


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const userId = searchParams.get("userId")
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
  }

  // Optimization: Run Auth/Member Check and Period Fetch in parallel
  // We need to know if the user is a member, and we need the current period info.
  const [roomMember, currentPeriod] = await Promise.all([
    prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: roomId,
        },
      },
    }),
    prisma.mealPeriod.findFirst({
      where: { roomId, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    })
  ]);

  if (!roomMember) {
    return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
  }

  try {
    let startDate: Date
    let endDate: Date
    let periodId: string | undefined = undefined

    // Logic: Use Active Period if exists, otherwise fallback to Params or Current Month
    if (currentPeriod) {
      startDate = currentPeriod.startDate
      endDate = currentPeriod.endDate || new Date()
      periodId = currentPeriod.id
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else {
      const monthRange = getCurrentMonthRange()
      startDate = monthRange.startDate
      endDate = monthRange.endDate
    }

    // Determine Cache Strategy
    // If we are looking at a specific closed period (by ID or Date), we can cache longer.
    // If we are looking at the ACTIVE period, we cache shorter (1-5 mins).
    const isHistorical = !currentPeriod && (startDateParam || periodId);
    const cacheControl = isHistorical
      ? 'private, s-maxage=300, stale-while-revalidate=600'
      : 'private, s-maxage=30, stale-while-revalidate=60';

    // If userId is provided, calculate for specific user
    if (userId) {
      const summary = await calculateUserMealSummary(userId, roomId, startDate, endDate, periodId)
      return NextResponse.json(summary, {
        headers: { 'Cache-Control': cacheControl }
      })
    }
    // Otherwise calculate for the entire room
    else {
      const summary = await calculateRoomMealSummary(roomId, startDate, endDate, periodId)
      return NextResponse.json(summary, {
        headers: { 'Cache-Control': cacheControl }
      })
    }
  } catch (error) {
    console.error("Error calculating meal summary:", error)
    return NextResponse.json({ error: "Failed to calculate meal summary" }, { status: 500 })
  }
}
