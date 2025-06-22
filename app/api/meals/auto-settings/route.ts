import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const userId = searchParams.get("userId")

  if (!roomId || !userId) {
    return NextResponse.json({ error: "Room ID and User ID are required" }, { status: 400 })
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
    // Check if autoMealSettings model exists
    if (!prisma.autoMealSettings) {
      return NextResponse.json({
        id: "default",
        userId: userId,
        roomId: roomId,
        isEnabled: false,
        breakfastEnabled: true,
        lunchEnabled: true,
        dinnerEnabled: true,
        guestMealEnabled: false,
        startDate: new Date().toISOString(),
        endDate: null,
        excludedDates: [],
        excludedMealTypes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Get or create auto meal settings
    let autoMealSettings = await prisma.autoMealSettings.findUnique({
      where: {
        userId_roomId: {
          userId: userId,
          roomId: roomId,
        },
      },
    })

    if (!autoMealSettings) {
      // Create default settings
      autoMealSettings = await prisma.autoMealSettings.create({
        data: {
          userId: userId,
          roomId: roomId,
          isEnabled: false,
          breakfastEnabled: true,
          lunchEnabled: true,
          dinnerEnabled: true,
          guestMealEnabled: false,
          startDate: new Date(),
          excludedDates: [],
          excludedMealTypes: [],
        },
      })
    }

    return NextResponse.json(autoMealSettings)
  } catch (error) {
    console.error("Error fetching auto meal settings:", error)
    return NextResponse.json({ error: "Failed to fetch auto meal settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")
    const userId = searchParams.get("userId")

    if (!roomId || !userId) {
      return NextResponse.json({ error: "Room ID and User ID are required" }, { status: 400 })
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

    // Users can only update their own auto meal settings
    if (session.user.id !== userId) {
      return NextResponse.json({ error: "You can only update your own auto meal settings" }, { status: 403 })
    }

    // Check if autoMealSettings model exists
    if (!prisma.autoMealSettings) {
      return NextResponse.json({
        id: "default",
        userId: userId,
        roomId: roomId,
        isEnabled: false,
        breakfastEnabled: true,
        lunchEnabled: true,
        dinnerEnabled: true,
        guestMealEnabled: false,
        startDate: new Date().toISOString(),
        endDate: null,
        excludedDates: [],
        excludedMealTypes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Get or create auto meal settings
    let autoMealSettings = await prisma.autoMealSettings.findUnique({
      where: {
        userId_roomId: {
          userId: userId,
          roomId: roomId,
        },
      },
    })

    if (!autoMealSettings) {
      // Create default settings
      autoMealSettings = await prisma.autoMealSettings.create({
        data: {
          userId: userId,
          roomId: roomId,
          isEnabled: false,
          breakfastEnabled: true,
          lunchEnabled: true,
          dinnerEnabled: true,
          guestMealEnabled: false,
          startDate: new Date(),
          excludedDates: [],
          excludedMealTypes: [],
        },
      })
    }

    // Update settings
    const updatedSettings = await prisma.autoMealSettings.update({
      where: {
        userId_roomId: {
          userId: userId,
          roomId: roomId,
        },
      },
      data: body,
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error("Error updating auto meal settings:", error)
    return NextResponse.json({ error: "Failed to update auto meal settings" }, { status: 500 })
  }
} 