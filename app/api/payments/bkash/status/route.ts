import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { queryBkashPayment } from "@/lib/bkash-service"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("paymentId")

  if (!paymentId) {
    return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
  }

  try {
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
      return NextResponse.json({ error: "Unauthorized to check this payment" }, { status: 403 })
    }

    // Query the payment status from Bkash
    const paymentData = await queryBkashPayment(paymentId)

    return NextResponse.json({
      success: true,
      status: paymentData.transactionStatus,
      trxId: paymentData.trxID,
      amount: paymentData.amount,
    })
  } catch (error) {
    console.error("Error checking Bkash payment status:", error)
    return NextResponse.json({ error: "Failed to check Bkash payment status" }, { status: 500 })
  }
}
