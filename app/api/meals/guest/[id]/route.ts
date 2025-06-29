import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { count } = body
    const guestMealId = params.id

    if (!count || count < 1) {
      return NextResponse.json({ error: "Count must be at least 1" }, { status: 400 })
    }

    // Get the guest meal
    const guestMeal = await prisma.guestMeal.findUnique({
      where: { id: guestMealId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!guestMeal) {
      return NextResponse.json({ error: "Guest meal not found" }, { status: 404 })
    }

    // Check if user owns this guest meal or has admin privileges
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: guestMeal.roomId,
        },
      },
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    const canEdit = session.user.id === guestMeal.userId || 
                   ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(roomMember.role)

    if (!canEdit) {
      return NextResponse.json({ error: "You can only edit your own guest meals" }, { status: 403 })
    }

    // Check meal settings for guest meal limit
    const mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: guestMeal.roomId },
    })

    if (mealSettings) {
      // Get other guest meals for the same user on the same date
      const otherGuestMeals = await prisma.guestMeal.findMany({
        where: {
          userId: guestMeal.userId,
          roomId: guestMeal.roomId,
          date: guestMeal.date,
          id: { not: guestMealId },
        },
      })

      const totalOtherGuestMeals = otherGuestMeals.reduce((sum, meal) => sum + meal.count, 0)
      const guestMealLimit = mealSettings.guestMealLimit || 5

      if (totalOtherGuestMeals + count > guestMealLimit) {
        return NextResponse.json({ 
          error: `Guest meal limit exceeded. You can only have ${guestMealLimit - totalOtherGuestMeals} more guest meals on this date.` 
        }, { status: 400 })
      }
    }

    // Update the guest meal
    const updatedGuestMeal = await prisma.guestMeal.update({
      where: { id: guestMealId },
      data: { 
        count: count,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(updatedGuestMeal)
  } catch (error) {
    console.error("Error updating guest meal:", error)
    return NextResponse.json({ error: "Failed to update guest meal" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const guestMealId = params.id

    // Get the guest meal
    const guestMeal = await prisma.guestMeal.findUnique({
      where: { id: guestMealId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!guestMeal) {
      return NextResponse.json({ error: "Guest meal not found" }, { status: 404 })
    }

    // Check if user owns this guest meal or has admin privileges
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: guestMeal.roomId,
        },
      },
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    const canDelete = session.user.id === guestMeal.userId || 
                     ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(roomMember.role)

    if (!canDelete) {
      return NextResponse.json({ error: "You can only delete your own guest meals" }, { status: 403 })
    }

    // Delete the guest meal
    await prisma.guestMeal.delete({
      where: { id: guestMealId },
    })

    return NextResponse.json({ message: "Guest meal deleted successfully" })
  } catch (error) {
    console.error("Error deleting guest meal:", error)
    return NextResponse.json({ error: "Failed to delete guest meal" }, { status: 500 })
  }
} 