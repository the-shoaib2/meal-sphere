import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createCustomNotification } from "@/lib/notification-utils"
import { uploadReceipt } from "@/lib/upload-utils"
import { ExpenseType, NotificationType } from '@prisma/client'
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
    const type = formData.get("type") as string
    const receiptFile = formData.get("receipt") as File | null

    // Validate data
    if (!roomId || !description || isNaN(amount) || !date || !type) {
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

    // Create expense and account transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create expense with period ID
      const expenseData = await addPeriodIdToData(roomId, {
        description,
        amount,
        date,
        type: type as ExpenseType,
        receiptUrl,
        userId: user.id,
        roomId,
      })

      const expense = await tx.extraExpense.create({
        data: expenseData,
      })

      // Create account transaction to decrease group balance
      // The expense is treated as a negative transaction from the group to the expense creator
      const accountTransaction = await tx.accountTransaction.create({
        data: {
          roomId,
          userId: user.id, // Who created the expense
          targetUserId: user.id, // The expense affects the group balance
          amount: -amount, // Negative amount to decrease group balance
          type: 'EXPENSE',
          description: `Expense: ${description}`,
          createdBy: user.id,
        },
      })

      return { expense, accountTransaction }
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
          not: user.id, // Exclude the user who added the expense
        },
      },
      include: {
        user: true,
      },
    })

    for (const member of roomMembers) {
      await createCustomNotification(
        member.user.id,
        `${user.name} added a new ${type.toLowerCase()} expense of ${amount} for ${description} in ${room?.name}.`
      )
    }

    return NextResponse.json({
      message: "Expense added successfully",
      expense: result.expense,
    })
  } catch (error) {
    console.error("Error adding expense:", error)
    return NextResponse.json({ message: "Failed to add expense" }, { status: 500 })
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
    const type = searchParams.get("type")

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

    // Add type filter if provided
    if (type) {
      whereClause.type = type
    }

    const expenses = await prisma.extraExpense.findMany({
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

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ message: "Failed to fetch expenses" }, { status: 500 })
  }
}
