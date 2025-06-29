import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { format, parse, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'

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

    // Check if user has permission to trigger auto meals
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

    // Check if user has admin/manager/meal manager role
    const canTriggerAutoMeals = ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(roomMember.role)
    if (!canTriggerAutoMeals) {
      return NextResponse.json({ error: "You don't have permission to trigger auto meals" }, { status: 403 })
    }

    // Get meal settings for the room
    const mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: roomId },
    })

    if (!mealSettings?.autoMealEnabled) {
      return NextResponse.json({ error: "Auto meal system is not enabled for this room" }, { status: 400 })
    }

    // Get all auto meal settings for the room
    const autoMealSettings = await prisma.autoMealSettings.findMany({
      where: { 
        roomId: roomId,
        isEnabled: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (autoMealSettings.length === 0) {
      return NextResponse.json({ message: "No users have auto meal settings enabled" })
    }

    const targetDate = new Date(date)
    const dateStr = format(targetDate, 'yyyy-MM-dd')
    const currentTime = format(new Date(), 'HH:mm')
    
    let processedCount = 0
    let skippedCount = 0

    // Process each user's auto meal settings
    for (const autoSetting of autoMealSettings) {
      const userId = autoSetting.userId

      // Check if date is excluded
      if (autoSetting.excludedDates.includes(dateStr)) {
        skippedCount++
        continue
      }

      // Check if user is within the date range
      if (autoSetting.startDate && isBefore(targetDate, new Date(autoSetting.startDate))) {
        skippedCount++
        continue
      }

      if (autoSetting.endDate && isAfter(targetDate, new Date(autoSetting.endDate))) {
        skippedCount++
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

        // Check if it's the right time for this meal
        const mealTime = mealType === 'BREAKFAST' ? mealSettings.breakfastTime :
                        mealType === 'LUNCH' ? mealSettings.lunchTime :
                        mealSettings.dinnerTime

        // Allow processing if it's within 5 minutes of meal time or if manually triggered
        const mealTimeDate = parse(mealTime, 'HH:mm', new Date())
        const currentTimeDate = parse(currentTime, 'HH:mm', new Date())
        const timeDiff = Math.abs(mealTimeDate.getTime() - currentTimeDate.getTime()) / (1000 * 60) // minutes

        if (timeDiff > 5) {
          // Not the right time, skip
          continue
        }

        // Check if user already has this meal
        const existingMeal = await prisma.meal.findUnique({
          where: {
            userId_roomId_date_type: {
              userId: userId,
              roomId: roomId,
              date: targetDate,
              type: mealType,
            },
          },
        })

        if (existingMeal) {
          // User already has this meal, skip
          continue
        }

        // Check if user has reached daily meal limit
        const todayMeals = await prisma.meal.count({
          where: {
            userId: userId,
            roomId: roomId,
            date: {
              gte: startOfDay(targetDate),
              lte: endOfDay(targetDate),
            },
          },
        })

        if (todayMeals >= (mealSettings.maxMealsPerDay || 3)) {
          // User has reached daily limit, skip
          continue
        }

        // Add the meal
        await prisma.meal.create({
          data: {
            userId: userId,
            roomId: roomId,
            date: targetDate,
            type: mealType,
          },
        })

        processedCount++

        // Add guest meal if enabled
        if (autoSetting.guestMealEnabled) {
          // Check if user has reached guest meal limit
          const todayGuestMeals = await prisma.guestMeal.findMany({
            where: {
              userId: userId,
              roomId: roomId,
              date: {
                gte: startOfDay(targetDate),
                lte: endOfDay(targetDate),
              },
            },
          })

          const totalGuestMeals = todayGuestMeals.reduce((sum, meal) => sum + meal.count, 0)
          
          if (totalGuestMeals < (mealSettings.guestMealLimit || 5)) {
            await prisma.guestMeal.create({
              data: {
                userId: userId,
                roomId: roomId,
                date: targetDate,
                type: mealType,
                count: 1,
              },
            })
          }
        }
      }
    }

    return NextResponse.json({
      message: `Auto meals processed successfully`,
      processed: processedCount,
      skipped: skippedCount,
      totalUsers: autoMealSettings.length,
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