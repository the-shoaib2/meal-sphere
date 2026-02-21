import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/services/prisma"
import { format } from 'date-fns'


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// This route would be called by a cron job (e.g., Vercel Cron) every minute
export async function GET(request: Request) {
  // Check for authorization
  const { searchParams } = new URL(request.url)
  const authKey = searchParams.get("key")

  if (authKey !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const currentTime = format(now, 'HH:mm')
    const today = format(now, 'yyyy-MM-dd')

    // Get all rooms with auto meal system enabled
    const roomsWithAutoMeal = await prisma.mealSettings.findMany({
      where: {
        autoMealEnabled: true,
      },
      select: {
        roomId: true,
        breakfastTime: true,
        lunchTime: true,
        dinnerTime: true,
        guestMealLimit: true,
      },
    })

    const processedMeals = []
    const newMealsToCreate: any[] = []
    const newGuestMealsToCreate: any[] = []

    for (const roomSettings of roomsWithAutoMeal) {
      // Get all auto meal settings for this room
      const autoMealSettings = await prisma.autoMealSettings.findMany({
        where: {
          roomId: roomSettings.roomId,
          isEnabled: true,
        },
      })

      // Normalize date to start of day for consistency
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)

      // Fetch period for this date to ensure record consistency
      const targetPeriod = await prisma.mealPeriod.findFirst({
        where: {
          roomId: roomSettings.roomId,
          startDate: { lte: todayDate },
          OR: [
            { endDate: { gte: todayDate } },
            { endDate: null }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!targetPeriod || targetPeriod.isLocked) continue // Skip if no period found or locked

      // Get existing counts/data to respect daily limits
      const [existingMeals, existingGuestMeals] = await Promise.all([
        prisma.meal.findMany({
          where: {
            roomId: roomSettings.roomId,
            date: todayDate,
          }
        }),
        prisma.guestMeal.findMany({
          where: {
            roomId: roomSettings.roomId,
            date: todayDate,
          }
        })
      ]);

      const mealCountByUser = new Map<string, number>();
      const guestMealCountByUser = new Map<string, number>();

      for (const m of existingMeals) {
        mealCountByUser.set(m.userId, (mealCountByUser.get(m.userId) || 0) + 1);
      }
      for (const gm of existingGuestMeals) {
        guestMealCountByUser.set(gm.userId, (guestMealCountByUser.get(gm.userId) || 0) + gm.count);
      }

      for (const autoSetting of autoMealSettings) {
        // Check if the date is excluded
        if (autoSetting.excludedDates.includes(today)) {
          continue
        }

        // Check each meal type
        const mealTypes = [
          { type: 'BREAKFAST' as const, time: roomSettings.breakfastTime, enabled: autoSetting.breakfastEnabled },
          { type: 'LUNCH' as const, time: roomSettings.lunchTime, enabled: autoSetting.lunchEnabled },
          { type: 'DINNER' as const, time: roomSettings.dinnerTime, enabled: autoSetting.dinnerEnabled },
        ]

        for (const mealType of mealTypes) {
          // Check if this meal type is enabled and it's the right time
          if (!mealType.enabled || currentTime !== mealType.time) {
            continue
          }

          // Check if this meal type is excluded
          if (autoSetting.excludedMealTypes.includes(mealType.type)) {
            continue
          }

          newMealsToCreate.push({
            userId: autoSetting.userId,
            roomId: roomSettings.roomId,
            date: todayDate,
            type: mealType.type,
            periodId: targetPeriod.id,
          })

          if (autoSetting.guestMealEnabled) {
            const currentGuestCount = guestMealCountByUser.get(autoSetting.userId) || 0;
            if (currentGuestCount < (roomSettings.guestMealLimit || 5)) {
              newGuestMealsToCreate.push({
                userId: autoSetting.userId,
                roomId: roomSettings.roomId,
                date: todayDate,
                type: mealType.type,
                count: 1,
                periodId: targetPeriod.id,
              });
              guestMealCountByUser.set(autoSetting.userId, currentGuestCount + 1);
            }
          }

          processedMeals.push({
            userId: autoSetting.userId,
            roomId: roomSettings.roomId,
            mealType: mealType.type,
            date: today,
          })
        }
      }
    }

    if (newMealsToCreate.length > 0) {
      await prisma.meal.createMany({ data: newMealsToCreate, skipDuplicates: true })
    }

    if (newGuestMealsToCreate.length > 0) {
      await prisma.guestMeal.createMany({ data: newGuestMealsToCreate, skipDuplicates: true })
    }

    return NextResponse.json({
      success: true,
      processedMeals,
      count: processedMeals.length,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Error processing auto meals:", error)
    return NextResponse.json({ error: "Failed to process auto meals" }, { status: 500 })
  }
}

// Manual trigger for testing
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

    // Trigger auto meal processing for the specified room and date
    const response = await fetch(`${request.url}?key=${process.env.CRON_SECRET_KEY}`, {
      method: 'GET',
    })

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error triggering auto meal processing:", error)
    return NextResponse.json({ error: "Failed to trigger auto meal processing" }, { status: 500 })
  }
} 
