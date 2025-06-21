import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateGuestMealSchema = z.object({
  count: z.number().min(1).max(10),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateGuestMealSchema.parse(body)

    // Check if user is a member of the room and owns the guest meal
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Get the guest meal and check ownership
    const guestMeal = await prisma.guestMeal.findUnique({
      where: { id: params.id },
      include: {
        room: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!guestMeal) {
      return NextResponse.json({ message: "Guest meal not found" }, { status: 404 })
    }

    if (guestMeal.userId !== user.id) {
      return NextResponse.json({ message: "You can only update your own guest meals" }, { status: 403 })
    }

    if (guestMeal.room.members.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Update the guest meal
    const updatedGuestMeal = await prisma.guestMeal.update({
      where: { id: params.id },
      data: {
        count: validatedData.count,
      },
    })

    return NextResponse.json({
      message: "Guest meal updated successfully",
      guestMeal: updatedGuestMeal,
    })
  } catch (error) {
    console.error("Error updating guest meal:", error)
    return NextResponse.json({ message: "Failed to update guest meal" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a member of the room and owns the guest meal
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Get the guest meal and check ownership
    const guestMeal = await prisma.guestMeal.findUnique({
      where: { id: params.id },
      include: {
        room: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!guestMeal) {
      return NextResponse.json({ message: "Guest meal not found" }, { status: 404 })
    }

    if (guestMeal.userId !== user.id) {
      return NextResponse.json({ message: "You can only delete your own guest meals" }, { status: 403 })
    }

    if (guestMeal.room.members.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Delete the guest meal
    await prisma.guestMeal.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "Guest meal deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting guest meal:", error)
    return NextResponse.json({ message: "Failed to delete guest meal" }, { status: 500 })
  }
} 