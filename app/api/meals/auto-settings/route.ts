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
  const userId = searchParams.get("userId") || session.user.id

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
    // Get or create auto meal settings for the user
    let autoMealSettings = await prisma.autoMealSettings.findUnique({
      where: {
        userId_roomId: {
          userId: userId,
          roomId: roomId,
        },
      },
    })

    if (!autoMealSettings) {
      // Create default auto meal settings
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
    const userId = searchParams.get("userId") || session.user.id

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
      // Create default settings first
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

    // Update the settings
    const updatedSettings = await prisma.autoMealSettings.update({
      where: {
        id: autoMealSettings.id,
      },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error("Error updating auto meal settings:", error)
    return NextResponse.json({ error: "Failed to update auto meal settings" }, { status: 500 })
  }
} 