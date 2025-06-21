import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { format } from 'date-fns'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roomId, date } = body

    if (!roomId || !date) {
      return NextResponse.json({ error: "Room ID and date are required" }, { status: 400 })
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

    // Get meal settings for the room
    const mealSettings = await prisma.mealSettings.findUnique({
      where: {
        roomId: roomId,
      },
    })

    if (!mealSettings || !mealSettings.autoMealEnabled) {
      return NextResponse.json({ message: "Auto meal system is not enabled for this room" })
    }

    // Get all auto meal settings for the room
    const autoMealSettings = await prisma.autoMealSettings.findMany({
      where: {
        roomId: roomId,
        isEnabled: true,
      },
    })

    const processedMeals = []

    for (const autoSetting of autoMealSettings) {
      // Check if the date is excluded
      const dateStr = format(new Date(date), 'yyyy-MM-dd')
      if (autoSetting.excludedDates.includes(dateStr)) {
        continue
      }

      // Process each meal type
      const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'] as const
      
      for (const mealType of mealTypes) {
        // Check if this meal type is enabled for the user
        const isEnabled = mealType === 'BREAKFAST' ? autoSetting.breakfastEnabled :
                         mealType === 'LUNCH' ? autoSetting.lunchEnabled :
                         autoSetting.dinnerEnabled

        if (!isEnabled) continue

        // Check if this meal type is excluded
        if (autoSetting.excludedMealTypes.includes(mealType)) continue

        // Check if meal already exists
        const existingMeal = await prisma.meal.findUnique({
          where: {
            userId_roomId_date_type: {
              userId: autoSetting.userId,
              roomId: roomId,
              date: new Date(date),
              type: mealType,
            },
          },
        })

        if (!existingMeal) {
          // Create the meal
          const meal = await prisma.meal.create({
            data: {
              userId: autoSetting.userId,
              roomId: roomId,
              date: new Date(date),
              type: mealType,
            },
          })

          processedMeals.push({
            userId: autoSetting.userId,
            mealType,
            date,
            mealId: meal.id,
          })
        }
      }
    }

    return NextResponse.json({
      message: "Auto meals processed successfully",
      processedMeals,
      count: processedMeals.length,
    })
  } catch (error) {
    console.error("Error processing auto meals:", error)
    return NextResponse.json({ error: "Failed to process auto meals" }, { status: 500 })
  }
}

// Manual trigger for testing
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const date = searchParams.get("date") || format(new Date(), 'yyyy-MM-dd')

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
  }

  // This would typically be called by a cron job
  // For now, we'll allow manual triggering for testing
  try {
    const response = await fetch(`${request.url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId, date }),
    })

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error triggering auto meal processing:", error)
    return NextResponse.json({ error: "Failed to trigger auto meal processing" }, { status: 500 })
  }
} 