"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { PaymentMethod } from "@prisma/client";
import { getPeriodForDate } from '@/lib/utils/period-utils';
import { invalidatePaymentCache } from "@/lib/cache/cache-invalidation";

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
