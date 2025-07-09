import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { calculateRoomMealSummary, calculateUserMealSummary, getCurrentMonthRange } from "@/lib/meal-calculations"

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
    // Get current period for the room
    const currentPeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: "ACTIVE",
      },
      orderBy: { startDate: "desc" },
    })

    let startDate: Date
    let endDate: Date
    let periodId: string | undefined = undefined

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

    // If userId is provided, calculate for specific user
    if (userId) {
      const summary = await calculateUserMealSummary(userId, roomId, startDate, endDate, periodId)
      return NextResponse.json(summary)
    }
    // Otherwise calculate for the entire room
    else {
      const summary = await calculateRoomMealSummary(roomId, startDate, endDate, periodId)
      return NextResponse.json(summary)
    }
  } catch (error) {
    console.error("Error calculating meal summary:", error)
    return NextResponse.json({ error: "Failed to calculate meal summary" }, { status: 500 })
  }
}
