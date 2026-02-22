"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { PaymentMethod } from "@prisma/client";
import { getPeriodForDate } from '@/lib/utils/period-utils';
import { invalidatePaymentCache } from "@/lib/cache/cache-invalidation";
import { createBkashPayment, executeBkashPayment, queryBkashPayment } from "@/lib/services/bkash-service";
import { v4 as uuidv4 } from "uuid";
import { createCustomNotification } from "@/lib/utils/notification-utils";

export async function createManualPaymentAction(data: {
  roomId: string;
  amount: number;
  method: string;
  description: string;
  date: string;
}) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const { roomId, amount, method, description } = data;

    if (!roomId || !amount || !method) {
      return { success: false, message: "Missing required fields" };
    }

    // Check if user is an authorized member (or admin, based on rules. For now simply a member)
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: roomId,
        },
      },
    });

    if (!roomMember) {
      return { success: false, message: "You are not a member of this room" };
    }

    // Check for admin rights if needed, but manual payment can sometimes be logged by anyone, or just admins.
    // The previous API just checked membership.

    const targetDate = data.date ? new Date(data.date) : new Date();
    const period = await getPeriodForDate(roomId, targetDate);

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        roomId: roomId,
        amount: Number.parseFloat(amount.toString()),
        method: method as PaymentMethod,
        description: description,
        date: targetDate,
        status: "COMPLETED",
        periodId: period?.id || null,
      },
    });

    await invalidatePaymentCache(session.user.id, roomId);

    return { success: true, payment };
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return { success: false, message: "Failed to create payment" };
  }
}

export async function createBkashPaymentAction(roomId: string, amount: number) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!roomId || !amount) {
      return { success: false, error: "Room ID and amount are required" };
    }

    // Check if user is a member of the room
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId,
        },
      },
    });

    if (!roomMember) {
      return { success: false, error: "You are not a member of this room" };
    }

    // Generate a unique invoice ID
    const invoiceId = `MS-${uuidv4().substring(0, 8)}-${Date.now()}`;

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
    });

    // Create a Bkash payment
    const callbackURL = `${process.env.NEXTAUTH_URL}/api/payments/bkash/callback`;
    const bkashPayment = await createBkashPayment(Number(amount), invoiceId, callbackURL);

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
    });

    return {
      success: true,
      paymentId: bkashPayment.paymentID,
      bkashURL: bkashPayment.bkashURL,
    };
  } catch (error: any) {
    console.error("Error creating Bkash payment:", error);
    return { success: false, error: error.message || "Failed to create Bkash payment" };
  }
}

export async function executeBkashPaymentAction(paymentId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!paymentId) {
      return { success: false, error: "Payment ID is required" };
    }

    // Find the Bkash payment record
    const bkashPayment = await prisma.bkashPayment.findUnique({
      where: {
        paymentId,
      },
    });

    if (!bkashPayment) {
      return { success: false, error: "Bkash payment not found" };
    }

    // Check if the payment belongs to the user
    if (bkashPayment.userId !== session.user.id) {
      return { success: false, error: "Unauthorized to execute this payment" };
    }

    // Execute the Bkash payment
    const executedPayment = await executeBkashPayment(paymentId);

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
    });

    // Update the payment record
    await prisma.payment.update({
      where: {
        id: bkashPayment.paymentRecordId,
      },
      data: {
        status: executedPayment.transactionStatus === "Completed" ? "COMPLETED" : "FAILED",
        description: `Bkash payment - TrxID: ${executedPayment.trxID}`,
      },
    });

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: {
        id: bkashPayment.roomId,
      },
      select: {
        name: true,
      },
    });

    // Create a notification for the user
    if (executedPayment.transactionStatus === "Completed" && room) {
      await createCustomNotification(
        session.user.id,
        `Your payment of ৳${bkashPayment.amount} to ${room.name} has been completed successfully. Transaction ID: ${executedPayment.trxID}`
      );
    }

    return {
      success: true,
      status: executedPayment.transactionStatus,
      trxId: executedPayment.trxID,
    };
  } catch (error: any) {
    console.error("Error executing Bkash payment:", error);
    return { success: false, error: error.message || "Failed to execute Bkash payment" };
  }
}

export async function getBkashPaymentStatusAction(paymentId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!paymentId) {
      return { success: false, error: "Payment ID is required" };
    }

    // Find the Bkash payment record
    const bkashPayment = await prisma.bkashPayment.findUnique({
      where: {
        paymentId,
      },
    });

    if (!bkashPayment) {
      return { success: false, error: "Bkash payment not found" };
    }

    // Check if the payment belongs to the user
    if (bkashPayment.userId !== session.user.id) {
      return { success: false, error: "Unauthorized to check this payment" };
    }

    // Query the payment status from Bkash
    const paymentData = await queryBkashPayment(paymentId);

    return {
      success: true,
      status: paymentData.transactionStatus,
      trxId: paymentData.trxID,
      amount: paymentData.amount,
    };
  } catch (error: any) {
    console.error("Error checking Bkash payment status:", error);
    return { success: false, error: "Failed to check Bkash payment status" };
  }
}
