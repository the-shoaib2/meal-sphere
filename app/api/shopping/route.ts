import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notification-utils"
import { uploadReceipt } from "@/lib/upload-utils"
import { NotificationType } from "@prisma/client"
import { getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod } from "@/lib/period-utils"


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

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

    // Validate that there's an active period
    try {
      await validateActivePeriod(roomId)
    } catch (error: any) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    // Create shopping item with period ID
    const shoppingData = await addPeriodIdToData(roomId, {
      name: description?.substring(0, 50) || 'Shopping Item', // Required field
      description,
      quantity: amount,
      date,
      receiptUrl,
      userId: user.id,
      roomId,
    })

    const shoppingItem = await prisma.shoppingItem.create({
      data: shoppingData,
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
        type: NotificationType.PAYMENT_CREATED,
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

    // Get period-aware where clause
    const whereClause = await getPeriodAwareWhereClause(roomId, {
      roomId,
    })

    // If no active period, return empty array
    if (whereClause.id === null) {
      return NextResponse.json([])
    }

    // Add date filter if provided
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const shoppingItems = await prisma.shoppingItem.findMany({
      where: whereClause,
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

    return NextResponse.json(shoppingItems, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error("Error fetching shopping items:", error)
    return NextResponse.json({ message: "Failed to fetch shopping items" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ message: "Item ID is required" }, { status: 400 })
    }

    // Get the current item to verify ownership
    const currentItem = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            members: {
              where: { userId: session.user.id },
              select: { role: true }
            }
          }
        }
      }
    })

    if (!currentItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    // Check if user is a member of the room
    if (currentItem.room.members.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'quantity', 'unit', 'purchased']
    const updates = Object.keys(updateData).filter(key => allowedUpdates.includes(key))

    if (updates.length === 0) {
      return NextResponse.json({ message: "No valid updates provided" }, { status: 400 })
    }

    const updatePayload: any = {}
    updates.forEach(update => {
      updatePayload[update] = updateData[update]
    })

    // Update the item
    const updatedItem = await prisma.shoppingItem.update({
      where: { id },
      data: updatePayload,
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
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating shopping item:", error)
    return NextResponse.json(
      { message: "Failed to update shopping item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const groupId = searchParams.get("groupId")

    if (!id || !groupId) {
      return NextResponse.json(
        { message: "Item ID and Group ID are required" },
        { status: 400 }
      )
    }

    // Get the current item to verify ownership
    const currentItem = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            members: {
              where: { userId: session.user.id },
              select: { role: true }
            }
          }
        }
      }
    })

    if (!currentItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    // Check if user is a member of the room
    if (currentItem.room.members.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Delete the item
    await prisma.shoppingItem.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Item deleted successfully" })
  } catch (error) {
    console.error("Error deleting shopping item:", error)
    return NextResponse.json(
      { message: "Failed to delete shopping item" },
      { status: 500 }
    )
  }
}
