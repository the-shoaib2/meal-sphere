import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createNotification } from "@/lib/notification-utils"
import { NotificationType } from "@prisma/client"

const marketDateSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = marketDateSchema.parse(body)

    // Check if user is a manager of the room
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: {
            roomId: validatedData.roomId,
            role: "MANAGER",
          },
        },
      },
    })

    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (currentUser.rooms.length === 0) {
      return NextResponse.json({ message: "You are not a manager of this room" }, { status: 403 })
    }

    // Check if the assigned user is a member of the room
    const assignedUser = await prisma.roomMember.findFirst({
      where: {
        userId: validatedData.userId,
        roomId: validatedData.roomId,
      },
      include: {
        user: true,
      },
    })

    if (!assignedUser) {
      return NextResponse.json({ message: "Assigned user is not a member of this room" }, { status: 400 })
    }

    // Create market date
    const marketDate = await prisma.marketDate.create({
      data: {
        date: validatedData.date,
        userId: validatedData.userId,
        roomId: validatedData.roomId,
      },
    })

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: { id: validatedData.roomId },
    })

    // Create notification for the assigned user
    await createNotification({
      userId: validatedData.userId,
      type: NotificationType.MEMBER_ADDED,
      message: `You have been assigned market duty for ${room?.name} on ${validatedData.date.toLocaleDateString()}.`,
    })

    return NextResponse.json({
      message: "Market date assigned successfully",
      marketDate,
    })
  } catch (error) {
    console.error("Error assigning market date:", error)
    return NextResponse.json({ message: "Failed to assign market date" }, { status: 500 })
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

    const marketDates = await prisma.marketDate.findMany({
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
    })

    return NextResponse.json(marketDates)
  } catch (error) {
    console.error("Error fetching market dates:", error)
    return NextResponse.json({ message: "Failed to fetch market dates" }, { status: 500 })
  }
}
