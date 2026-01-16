import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { cacheGetOrSet } from "@/lib/cache-service"
import { getPaymentsCacheKey, CACHE_TTL } from "@/lib/cache-keys"
import { invalidatePaymentCache } from "@/lib/cache-invalidation"

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")

  try {
    // Generate cache key
    const cacheKey = getPaymentsCacheKey(session.user.id, roomId || undefined)

    // Try to get from cache or fetch fresh data
    const payments = await cacheGetOrSet(
      cacheKey,
      async () => {
        const whereClause: any = {
          userId: session.user.id,
        }

        if (roomId) {
          whereClause.roomId = roomId
        }

        return await prisma.payment.findMany({
          where: whereClause,
          include: {
            room: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        })
      },
      { ttl: CACHE_TTL.CALCULATIONS_ACTIVE }
    )

    return NextResponse.json(payments, {
      headers: {
        'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roomId, amount, method, description } = body

    if (!roomId || !amount || !method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        roomId: roomId,
        amount: Number.parseFloat(amount),
        method: method,
        description: description,
        date: new Date(),
        status: "COMPLETED", // For simplicity, assuming payment is completed
      },
    })

    // Invalidate cache
    await invalidatePaymentCache(session.user.id, roomId)

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}
