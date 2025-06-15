import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notification-utils"
import { uploadReceipt } from "@/lib/upload-utils"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const roomId = formData.get("roomId") as string
    const description = formData.get("description") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const date = new Date(formData.get("date") as string)
    const receiptFile = formData.get("receipt") as File | null

    // Validate data
    if (!roomId || !description || isNaN(amount) || !date) {
      return NextResponse.json({ message: "Invalid data provided" }, { status: 400 })
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

    // Upload receipt if provided
    let receiptUrl = null
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile, user.id, roomId)
    }

    // Create shopping item
    const shoppingItem = await prisma.shoppingItem.create({
      data: {
        description,
        amount,
        date,
        receiptUrl,
        userId: user.id,
        roomId,
      },
    })

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    // Create notifications for room members
    const roomMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        userId: {
          not: user.id, // Exclude the user who added the shopping item
        },
      },
      include: {
        user: true,
      },
    })

    for (const member of roomMembers) {
      await createNotification({
        userId: member.user.id,
        type: "SHOPPING_ADDED",
        message: `${user.name} added a new shopping item of ${amount} for ${description} in ${room?.name}.`,
      })
    }

    return NextResponse.json({
      message: "Shopping item added successfully",
      shoppingItem,
    })
  } catch (error) {
    console.error("Error adding shopping item:", error)
    return NextResponse.json({ message: "Failed to add shopping item" }, { status: 500 })
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

    const shoppingItems = await prisma.shoppingItem.findMany(query)

    return NextResponse.json(shoppingItems)
  } catch (error) {
    console.error("Error fetching shopping items:", error)
    return NextResponse.json({ message: "Failed to fetch shopping items" }, { status: 500 })
  }
}
