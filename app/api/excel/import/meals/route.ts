import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { importMealsFromExcel } from "@/lib/excel-utils"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const roomId = formData.get("roomId") as string
    const file = formData.get("file") as File

    if (!roomId || !file) {
      return NextResponse.json({ error: "Room ID and file are required" }, { status: 400 })
    }

    // Check if user is a member of the room with appropriate permissions
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId,
        },
      },
    })

    if (!roomMember || (roomMember.role !== "ADMIN" && roomMember.role !== "MANAGER")) {
      return NextResponse.json({ error: "You don't have permission to import data for this room" }, { status: 403 })
    }

    // Convert file to array buffer
    const buffer = await file.arrayBuffer()

    // Import the data
    const result = await importMealsFromExcel(roomId, buffer)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error importing meals from Excel:", error)
    return NextResponse.json({ error: "Failed to import meals from Excel" }, { status: 500 })
  }
}
