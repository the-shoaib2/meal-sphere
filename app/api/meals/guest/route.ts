import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createNotification } from "@/lib/notification-utils"

const guestMealSchema = z.object({
  roomId: z.string(),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  count: z.number().min(1).max(10),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = guestMealSchema.parse(body)

    // Check if user is a member of the room
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: { roomId: validatedData.roomId },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.rooms.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Create guest meal
    const guestMeal = await prisma.guestMeal.create({
      data: {
        date: validatedData.date,
        type: validatedData.type,
        count: validatedData.count,
        userId: user.id,
        roomId: validatedData.roomId,
      },
    })

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: { id: validatedData.roomId },
    })

    // Create notification for room manager
    const roomManagers = await prisma.roomMember.findMany({
      where: {
        roomId: validatedData.roomId,
        role: "MANAGER",
      },
      include: {
        user: true,
      },
    })

    for (const manager of roomManagers) {
      await createNotification({
        userId: manager.user.id,
        type: "GUEST_MEAL_ADDED",
        message: `${user.name} has requested ${validatedData.count} guest meal(s) for ${validatedData.type.toLowerCase()} on ${validatedData.date.toLocaleDateString()} in ${room?.name}.`,
      })
    }

    return NextResponse.json({
      message: "Guest meal requested successfully",
      guestMeal,
    })
  } catch (error) {
    console.error("Error requesting guest meal:", error)
    return NextResponse.json({ message: "Failed to request guest meal" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!roomId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 })
    }

    // Check if user is a member of the room
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: { roomId },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.rooms.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Build query
    const query: any = {
      where: {
        roomId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    }

    // Add date filter if provided
    if (startDate && endDate) {
      query.where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const guestMeals = await prisma.guestMeal.findMany(query)

    return NextResponse.json(guestMeals)
  } catch (error) {
    console.error("Error fetching guest meals:", error)
    return NextResponse.json({ message: "Failed to fetch guest meals" }, { status: 500 })
  }
}
