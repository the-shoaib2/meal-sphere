import { NextRequest, NextResponse } from 'next/server'
import prisma from "@/lib/prisma"
import { queryBkashPayment } from "@/lib/bkash-service"
import { createCustomNotification } from "@/lib/notification-utils"


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("paymentID")
  const status = searchParams.get("status")

  if (!paymentId) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL }/dashboard/payments?error=missing-payment-id`,
    )
  }

  try {
    // Find the Bkash payment record
    const bkashPayment = await prisma.bkashPayment.findUnique({
      where: {
        paymentId,
      },
    })

    if (!bkashPayment) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL }/dashboard/payments?error=payment-not-found`,
      )
    }

    if (status === "success") {
      // Query the payment status from Bkash
      const paymentData = await queryBkashPayment(paymentId)

      // Update the Bkash payment record
      await prisma.bkashPayment.update({
        where: {
          paymentId,
        },
        data: {
          status: paymentData.transactionStatus,
          trxId: paymentData.trxID,
          customerMsisdn: paymentData.customerMsisdn,
          updatedAt: new Date(),
        },
      })

      // Update the payment record
      await prisma.payment.update({
        where: {
          id: bkashPayment.paymentRecordId,
        },
        data: {
          status: paymentData.transactionStatus === "Completed" ? "COMPLETED" : "FAILED",
          description: `Bkash payment - TrxID: ${paymentData.trxID}`,
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
      if (paymentData.transactionStatus === "Completed" && room) {
        await createCustomNotification(
          bkashPayment.userId,
          `Your payment of ৳${bkashPayment.amount} to ${room.name} has been completed successfully. Transaction ID: ${paymentData.trxID}`,
        )
      }

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/payments?success=true&paymentId=${paymentId}`,
      )
    } else {
      // Update the Bkash payment record
      await prisma.bkashPayment.update({
        where: {
          paymentId,
        },
        data: {
          status: "Failed",
          updatedAt: new Date(),
        },
      })

      // Update the payment record
      await prisma.payment.update({
        where: {
          id: bkashPayment.paymentRecordId,
        },
        data: {
          status: "FAILED",
          description: `Bkash payment failed`,
        },
      })

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/payments?error=payment-failed`,
      )
    }
  } catch (error) {
    console.error("Error processing Bkash callback:", error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/payments?error=server-error`,
    )
  }
}
