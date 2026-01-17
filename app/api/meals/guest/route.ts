import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/services/prisma"
import { z } from "zod"
import { createNotification } from "@/lib/utils/notification-utils"
import { NotificationType } from "@prisma/client"


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

const guestMealSchema = z.object({
  roomId: z.string(),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  count: z.number().min(1).max(10),
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

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

  // Build query filters
  const dateFilter: any = {}

  if (startDate) {
    dateFilter.gte = new Date(startDate)
  }

  if (endDate) {
    dateFilter.lte = new Date(endDate)
  }

  const whereClause: any = {
    roomId: roomId,
  }

  if (Object.keys(dateFilter).length > 0) {
    whereClause.date = dateFilter
  }

  try {
    // Get current period for filtering
    const currentPeriod = await prisma.mealPeriod.findFirst({
      where: { roomId, status: 'ACTIVE' }
    });

    const whereClause: any = {
      roomId: roomId,
      ...(currentPeriod ? { periodId: currentPeriod.id } : {})
    }

    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter
    }

    const guestMeals = await prisma.guestMeal.findMany({
      where: whereClause,
      include: {
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

    return NextResponse.json(guestMeals, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error("Error fetching guest meals:", error)
    return NextResponse.json({ error: "Failed to fetch guest meals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roomId, date, type, count = 1 } = body

    if (!roomId || !date || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    // Check meal settings to see if guest meals are allowed
    const mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: roomId },
    })

    if (mealSettings && !mealSettings.allowGuestMeals) {
      return NextResponse.json({ error: "Guest meals are not allowed in this room" }, { status: 403 })
    }

    // Check guest meal limit
    const todayGuestMeals = await prisma.guestMeal.findMany({
      where: {
        userId: session.user.id,
        roomId: roomId,
        date: new Date(date),
      },
    })

    const totalGuestMeals = todayGuestMeals.reduce((sum, meal) => sum + meal.count, 0)
    const guestMealLimit = mealSettings?.guestMealLimit || 5

    if (totalGuestMeals + count > guestMealLimit) {
      return NextResponse.json({
        error: `Guest meal limit exceeded. You can only add ${guestMealLimit - totalGuestMeals} more guest meals today.`
      }, { status: 400 })
    }

    // Create guest meal
    const guestMeal = await prisma.guestMeal.create({
      data: {
        userId: session.user.id,
        roomId: roomId,
        date: new Date(date),
        type: type,
        count: count,
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

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    // Create notification for room manager
    const roomManagers = await prisma.roomMember.findMany({
      where: {
        roomId: roomId,
        role: "MANAGER",
      },
      include: {
        user: true,
      },
    })

    for (const manager of roomManagers) {
      await createNotification({
        userId: manager.user.id,
        type: NotificationType.MEAL_CREATED,
        message: `${session.user.name} has requested ${count} guest meal(s) for ${type.toLowerCase()} on ${date.toLocaleDateString()} in ${room?.name}.`,
      })
    }

    return NextResponse.json(guestMeal)
  } catch (error) {
    console.error("Error creating guest meal:", error)
    return NextResponse.json({ error: "Failed to create guest meal" }, { status: 500 })
  }
}
