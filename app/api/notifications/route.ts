import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { NotificationType } from '@prisma/client'


export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    
    // Find notifications for the user
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        type: {
          in: [
            NotificationType.MEMBER_ADDED,
            NotificationType.MEMBER_REMOVED,
            NotificationType.MEAL_CREATED,
            NotificationType.MEAL_UPDATED,
            NotificationType.MEAL_DELETED,
            NotificationType.PAYMENT_CREATED,
            NotificationType.PAYMENT_UPDATED,
            NotificationType.PAYMENT_DELETED,
            NotificationType.JOIN_REQUEST_APPROVED,
            NotificationType.JOIN_REQUEST_REJECTED
          ]
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })
    
    // Transform the data to match the expected format
    const result = notifications.map(notif => ({
      id: notif.id,
      type: notif.type,
      message: notif.message,
      read: notif.read || false,
      createdAt: notif.createdAt,
      userId: notif.userId
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    
    const body = await request.json()
    const { userId, type, message } = body

    // Check if user has permission to create notification for this user
    // Only allow creating notifications for self or if admin/manager
    if (userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized to create notification for this user" }, { status: 403 })
    }


    const now = new Date()
    const notification = {
      userId,
      type,
      message,
      read: false,
      createdAt: now,
      updatedAt: now
    }

    const result = await prisma.notification.create({ data: notification })
    
    if (!result) {
      throw new Error('Failed to insert notification')
    }

    // Fetch the inserted notification to return
    const insertedNotification = await prisma.notification.findUnique({ where: { id: result.id } })
    
    if (!insertedNotification) {
      throw new Error('Failed to fetch created notification')
    }

    // Transform to match expected format
    const response = {
      id: insertedNotification.id,
      type: insertedNotification.type,
      message: insertedNotification.message,
      read: insertedNotification.read || false,
      createdAt: insertedNotification.createdAt
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}