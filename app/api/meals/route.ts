import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod, getCurrentPeriod } from "@/lib/period-utils"

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

  try {
    // Get period-aware where clause
    const whereClause = await getPeriodAwareWhereClause(roomId, {
      roomId: roomId,
    })

    // If no active period, return empty array
    if (whereClause.id === null) {
      return NextResponse.json([])
    }

    // Add date filter if provided
    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter
    }

    const meals = await prisma.meal.findMany({
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

    return NextResponse.json(meals)
  } catch (error) {
    console.error("Error fetching meals:", error)
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roomId, date, type } = body

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

    // Validate that there's an active period
    try {
      await validateActivePeriod(roomId)
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Check if meal already exists (within the current period)
    const currentPeriod = await getCurrentPeriod(roomId)
    const existingMeal = await prisma.meal.findFirst({
      where: {
        userId: session.user.id,
        roomId: roomId,
        date: new Date(date),
        type: type,
        periodId: currentPeriod?.id,
      },
    })

    if (existingMeal) {
      // If meal exists, delete it (toggle behavior)
      await prisma.meal.delete({
        where: {
          id: existingMeal.id,
        },
      })

      return NextResponse.json({ message: "Meal removed successfully" })
    } else {
      // Create new meal with period ID
      const mealData = await addPeriodIdToData(roomId, {
        userId: session.user.id,
        roomId: roomId,
        date: new Date(date),
        type: type,
      })

      const meal = await prisma.meal.create({
        data: mealData,
      })

      return NextResponse.json(meal)
    }
  } catch (error) {
    console.error("Error managing meal:", error)
    return NextResponse.json({ error: "Failed to manage meal" }, { status: 500 })
  }
}
