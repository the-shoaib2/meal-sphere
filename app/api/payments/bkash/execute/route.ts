import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { executeBkashPayment } from "@/lib/bkash-service"
import { createCustomNotification } from "@/lib/notification-utils"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    // Find the Bkash payment record
    const bkashPayment = await prisma.bkashPayment.findUnique({
      where: {
        paymentId,
      },
    })

    if (!bkashPayment) {
      return NextResponse.json({ error: "Bkash payment not found" }, { status: 404 })
    }

    // Check if the payment belongs to the user
    if (bkashPayment.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized to execute this payment" }, { status: 403 })
    }

    // Execute the Bkash payment
    const executedPayment = await executeBkashPayment(paymentId)

    // Update the Bkash payment record
    await prisma.bkashPayment.update({
      where: {
        paymentId,
      },
      data: {
        status: executedPayment.transactionStatus,
        trxId: executedPayment.trxID,
        customerMsisdn: executedPayment.customerMsisdn,
        updatedAt: new Date(),
      },
    })

    // Update the payment record
    await prisma.payment.update({
      where: {
        id: bkashPayment.paymentRecordId,
      },
      data: {
        status: executedPayment.transactionStatus === "Completed" ? "COMPLETED" : "FAILED",
        description: `Bkash payment - TrxID: ${executedPayment.trxID}`,
      },
    })

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: {
        id: bkashPayment.roomId,
      },
      select: {
        name: true,
      },
    })

    // Create a notification for the user
    if (executedPayment.transactionStatus === "Completed" && room) {
      await createCustomNotification(
        session.user.id,
        `Your payment of ৳${bkashPayment.amount} to ${room.name} has been completed successfully. Transaction ID: ${executedPayment.trxID}`,
      )
    }

    return NextResponse.json({
      success: true,
      status: executedPayment.transactionStatus,
      trxId: executedPayment.trxID,
    })
  } catch (error) {
    console.error("Error executing Bkash payment:", error)
    return NextResponse.json({ error: "Failed to execute Bkash payment" }, { status: 500 })
  }
}
