import { prisma } from "@/lib/services/prisma"
import { format } from 'date-fns'
import { createMealReminder } from "@/lib/utils/notification-utils"

export async function processAutoMeals() {
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
      },
    })

    const processedMeals = []

    for (const roomSettings of roomsWithAutoMeal) {
      // Get all auto meal settings for this room
      const autoMealSettings = await prisma.autoMealSettings.findMany({
        where: {
          roomId: roomSettings.roomId,
          isEnabled: true,
        },
      })

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

          // Check if meal already exists
          const existingMeal = await prisma.meal.findUnique({
            where: {
              userId_roomId_date_type: {
                userId: autoSetting.userId,
                roomId: roomSettings.roomId,
                date: now,
                type: mealType.type,
              },
            },
          })

          if (!existingMeal) {
            // Create the meal
            const meal = await prisma.meal.create({
              data: {
                userId: autoSetting.userId,
                roomId: roomSettings.roomId,
                date: now,
                type: mealType.type,
              },
            })

            processedMeals.push({
              userId: autoSetting.userId,
              roomId: roomSettings.roomId,
              mealType: mealType.type,
              date: today,
              mealId: meal.id,
            })
          }
        }
      }
    }

    return {
      success: true,
      processedMeals,
      count: processedMeals.length,
      timestamp: now.toISOString(),
    }
}

export async function processMealReminders() {
    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        isActive: true
        // active users only
      },
      select: {
        id: true,
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // For each user, check if they've already marked meals for today
    const results = await Promise.all(
      users.map(async (user) => {
        // Check if user has already marked any meals for today
        const existingMeals = await prisma.meal.findMany({
          where: {
            userId: user.id,
            date: {
              gte: today,
              lt: tomorrow, 
            },
          },
        })

        // If no meals marked for today, send a reminder
        if (existingMeals.length === 0) {
          return createMealReminder(user.id)
        }

        return null
      }),
    )

    // Filter out null results
    const notifications = results.filter(Boolean)

    return {
      success: true,
      notificationsSent: notifications.length,
    }
}
