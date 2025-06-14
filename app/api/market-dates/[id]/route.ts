import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const marketDateUpdateSchema = z.object({
  completed: z.boolean(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    const body = await request.json()
    const validatedData = marketDateUpdateSchema.parse(body)

    // Get the market date
    const marketDate = await prisma.marketDate.findUnique({
      where: { id },
      include: {
        room: true,
      },
    })

    if (!marketDate) {
      return NextResponse.json({ message: "Market date not found" }, { status: 404 })
    }

    // Check if user is the assigned user or a manager
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: {
            roomId: marketDate.roomId,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const isManager = user.rooms.some((membership) => membership.role === "MANAGER")
    const isAssignedUser = marketDate.userId === user.id

    if (!isManager && !isAssignedUser) {
      return NextResponse.json({ message: "You are not authorized to update this market date" }, { status: 403 })
    }

    // Update market date
    const updatedMarketDate = await prisma.marketDate.update({
      where: { id },
      data: {
        completed: validatedData.completed,
      },
    })

    return NextResponse.json({
      message: "Market date updated successfully",
      marketDate: updatedMarketDate,
    })
  } catch (error) {
    console.error("Error updating market date:", error)
    return NextResponse.json({ message: "Failed to update market date" }, { status: 500 })
  }
}
