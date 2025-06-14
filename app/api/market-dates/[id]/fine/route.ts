import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notification-utils"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const id = params.id

    // Get the market date
    const marketDate = await prisma.marketDate.findUnique({
      where: { id },
      include: {
        room: true,
        user: true,
      },
    })

    if (!marketDate) {
      return NextResponse.json({ message: "Market date not found" }, { status: 404 })
    }

    // Check if user is a manager
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: {
            roomId: marketDate.roomId,
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

    // Check if fine is enabled for the room
    if (!marketDate.room.fineEnabled) {
      return NextResponse.json({ message: "Fines are not enabled for this room" }, { status: 400 })
    }

    // Check if market date is already fined
    if (marketDate.fined) {
      return NextResponse.json({ message: "Market date is already fined" }, { status: 400 })
    }

    // Check if market date is completed
    if (marketDate.completed) {
      return NextResponse.json({ message: "Cannot fine a completed market date" }, { status: 400 })
    }

    // Check if market date is in the past
    if (new Date(marketDate.date) > new Date()) {
      return NextResponse.json({ message: "Cannot fine a future market date" }, { status: 400 })
    }

    // Update market date
    const updatedMarketDate = await prisma.marketDate.update({
      where: { id },
      data: {
        fined: true,
      },
    })

    // Create notification for the user
    await createNotification({
      userId: marketDate.userId,
      type: "FINE_APPLIED",
      message: `You have been fined ${marketDate.room.fineAmount} for missing market duty on ${new Date(marketDate.date).toLocaleDateString()} in ${marketDate.room.name}.`,
    })

    return NextResponse.json({
      message: "Fine applied successfully",
      marketDate: updatedMarketDate,
    })
  } catch (error) {
    console.error("Error applying fine:", error)
    return NextResponse.json({ message: "Failed to apply fine" }, { status: 500 })
  }
}
