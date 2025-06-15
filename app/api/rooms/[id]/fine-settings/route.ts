import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const fineSettingsSchema = z.object({
  fineAmount: z.number().min(0),
  fineEnabled: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const validatedData = fineSettingsSchema.parse(body)

    // Check if user is a manager of the room
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: {
            roomId: id,
            role: "MANAGER",
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.rooms.length === 0) {
      return NextResponse.json({ message: "You are not a manager of this room" }, { status: 403 })
    }

    // Update room fine settings
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        fineAmount: validatedData.fineAmount,
        fineEnabled: validatedData.fineEnabled,
      },
    })

    return NextResponse.json({
      message: "Fine settings updated successfully",
      room: updatedRoom,
    })
  } catch (error) {
    console.error("Error updating fine settings:", error)
    return NextResponse.json({ message: "Failed to update fine settings" }, { status: 500 })
  }
}
