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
    // Get or create meal settings for the room
    let mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: roomId },
    })

    if (!mealSettings) {
      // Create default meal settings
      mealSettings = await prisma.mealSettings.create({
        data: {
          roomId: roomId,
          breakfastTime: "08:00",
          lunchTime: "13:00",
          dinnerTime: "20:00",
          autoMealEnabled: false,
          mealCutoffTime: "22:00",
          maxMealsPerDay: 3,
          allowGuestMeals: true,
          guestMealLimit: 5,
        },
      })
    }

    return NextResponse.json(mealSettings)
  } catch (error) {
    console.error("Error fetching meal settings:", error)
    return NextResponse.json({ error: "Failed to fetch meal settings" }, { status: 500 })
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

    // Check if user has permission to update meal settings
    const canUpdateSettings = ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(roomMember.role)
    if (!canUpdateSettings) {
      return NextResponse.json({ error: "You don't have permission to update meal settings" }, { status: 403 })
    }

    // Get or create meal settings
    let mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: roomId },
    })

    if (!mealSettings) {
      // Create default settings first
      mealSettings = await prisma.mealSettings.create({
        data: {
          roomId: roomId,
          breakfastTime: "08:00",
          lunchTime: "13:00",
          dinnerTime: "20:00",
          autoMealEnabled: false,
          mealCutoffTime: "22:00",
          maxMealsPerDay: 3,
          allowGuestMeals: true,
          guestMealLimit: 5,
        },
      })
    }

    // Update the settings
    const updatedSettings = await prisma.mealSettings.update({
      where: {
        id: mealSettings.id,
      },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error("Error updating meal settings:", error)
    return NextResponse.json({ error: "Failed to update meal settings" }, { status: 500 })
  }
} 