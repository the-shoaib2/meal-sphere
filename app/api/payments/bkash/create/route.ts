import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"
import { createBkashPayment } from "@/lib/bkash-service"
import { v4 as uuidv4 } from "uuid"


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roomId, amount } = body

    if (!roomId || !amount) {
      return NextResponse.json({ error: "Room ID and amount are required" }, { status: 400 })
    }

    // Check if user is a member of the room
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId,
        },
      },
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    // Generate a unique invoice ID
    const invoiceId = `MS-${uuidv4().substring(0, 8)}-${Date.now()}`

    // Create a pending payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        roomId,
        amount: Number(amount),
        method: "BKASH",
        status: "PENDING",
        description: `Bkash payment - Invoice #${invoiceId}`,
        date: new Date(),
      },
    })

    // Create a Bkash payment
    const callbackURL = `${process.env.NEXTAUTH_URL}/api/payments/bkash/callback`
    const bkashPayment = await createBkashPayment(Number(amount), invoiceId, callbackURL)

    // Store the Bkash payment ID in the database
    await prisma.bkashPayment.create({
      data: {
        paymentId: bkashPayment.paymentID,
        invoiceId,
        amount: Number(amount),
        status: bkashPayment.transactionStatus,
        userId: session.user.id,
        roomId,
        paymentRecordId: payment.id,
      },
    })

    return NextResponse.json({
      success: true,
      paymentId: bkashPayment.paymentID,
      bkashURL: bkashPayment.bkashURL,
    })
  } catch (error) {
    console.error("Error creating Bkash payment:", error)
    return NextResponse.json({ error: "Failed to create Bkash payment" }, { status: 500 })
  }
}
