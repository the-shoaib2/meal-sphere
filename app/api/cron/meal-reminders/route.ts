import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createMealReminder } from "@/lib/notification-utils"

// This route would be called by a cron job (e.g., Vercel Cron)
export async function GET(request: Request) {
  // Check for authorization (you might want to add a secret key check)
  const { searchParams } = new URL(request.url)
  const authKey = searchParams.get("key")

  if (authKey !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        // You might want to add additional filters here
      },
      select: {
        id: true,
      },
    })

    // Get current date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // For each user, check if they've already marked meals for today
    const results = await Promise.all(
      users.map(async (user) => {
        // Check if user has already marked any meals for today
        const existingMeals = await prisma.meal.findMany({
          where: {
            userId: user.id,
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
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

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
    })
  } catch (error) {
    console.error("Error sending meal reminders:", error)
    return NextResponse.json({ error: "Failed to send meal reminders" }, { status: 500 })
  }
}
