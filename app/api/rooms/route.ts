import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get rooms where user is a member
    const userRooms = await prisma.roomMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        room: true,
      },
    })

    const rooms = userRooms.map((ur) => ur.room)

    return NextResponse.json(rooms)
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Create room and add user as a member with MANAGER role
    const room = await prisma.room.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: session.user.id,
            role: "MANAGER",
          },
        },
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}
