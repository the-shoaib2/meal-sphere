"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import * as ExpenseService from "@/lib/services/expenses-service";
import { uploadReceipt } from "@/lib/utils/upload-utils";
import { ExpenseType, NotificationType } from "@prisma/client";
import { validateActivePeriod } from "@/lib/utils/period-utils";
import { notifyRoomMembersBatch } from "@/lib/utils/notification-utils";

/**
 * Helper to get the authenticated user's ID
 */
async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (!session?.user?.email) throw new Error("Unauthorized");
    // Fallback if ID is poorly mapped
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");
    return user.id;
  }
  return session.user.id;
}

/**
 * Validates that the user is a member of the room
 */
async function validateMembership(userId: string, roomId: string) {
  const member = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
  });

  if (!member) {
    throw new Error("You are not a member of this room");
  }

  return member;
}

export async function createExpenseAction(formData: FormData) {
  try {
    const userId = await getUserId();
    const roomId = formData.get("roomId") as string;
    const description = formData.get("description") as string;
    const amount = Number.parseFloat(formData.get("amount") as string);
    const date = new Date(formData.get("date") as string);
    const type = formData.get("type") as ExpenseType;
    const receiptFile = formData.get("receipt") as File | null;

    if (!roomId || !description || isNaN(amount) || !date || !type) {
      return { success: false, message: "Invalid data provided" };
    }

    await validateMembership(userId, roomId);

    // Validate active period early
    await validateActivePeriod(roomId);

    let receiptUrl = null;
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile, userId, roomId);
    }

    // Call service 
    // Wait, createExpense requires periodId. Let's find current period manually first since 
    // the service's createExpense requires periodId.
    const { getPeriodAwareWhereClause } = await import("@/lib/utils/period-utils");
    const activeFilter = await getPeriodAwareWhereClause(roomId, { roomId });
    if ((activeFilter as any)?.periodId === null) {
       return { success: false, message: "No active period found" };
    }
    const periodId = (activeFilter as any)?.periodId;

    if (!periodId && activeFilter) {
       // getPeriodAwareWhereClause might return { periodId: "..." } or similar
       // If it doesn't strictly provide periodId, let's fetch it via getCurrentPeriod
       const { getCurrentPeriod } = await import("@/lib/utils/period-utils");
       const currentPeriod = await getCurrentPeriod(roomId);
       if (!currentPeriod) return { success: false, message: "No active period found" };
    }

    const finalPeriodId = periodId || (await (await import("@/lib/utils/period-utils")).getCurrentPeriod(roomId))?.id;
    
    if (!finalPeriodId) {
      return { success: false, message: "Required active period." };
    }

    const expense = await ExpenseService.createExpense({
      roomId,
      userId,
      description,
      amount,
      date,
      type: type as any,
      receiptUrl,
      periodId: finalPeriodId
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    await notifyRoomMembersBatch(
      roomId,
      NotificationType.GENERAL,
      `${user?.name || 'Someone'} added a new ${type.toLowerCase()} expense of ${amount} for ${description} in ${room?.name || 'the group'}.`,
      userId
    );

    return { success: true, expense };
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return { success: false, message: error.message || "Failed to add expense" };
  }
}

export async function updateExpenseAction(expenseId: string, formData: FormData) {
  try {
    const userId = await getUserId();
    
    // Auth validation
    const existingExpense = await prisma.extraExpense.findUnique({
      where: { id: expenseId },
      include: {
        room: {
          select: {
            members: {
              where: { userId },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!existingExpense) {
      return { success: false, message: "Expense not found" };
    }

    if (existingExpense.room.members.length === 0) {
      return { success: false, message: "Unauthorized to update this expense" };
    }

    // Parse formData
    const descriptionStr = formData.get("description") as string | null;
    const amountStr = formData.get("amount") as string | null;
    const dateStr = formData.get("date") as string | null;
    const typeStr = formData.get("type") as string | null;
    const receiptFile = formData.get("receipt") as File | null;

    let receiptUrl = existingExpense.receiptUrl;
    if (receiptFile) {
        // Mock upload or actually replace in prod
        console.log("New receipt uploaded (mock)");
    }

    const updateData: ExpenseService.UpdateExpenseData = {};
    if (descriptionStr) updateData.description = descriptionStr;
    if (amountStr) updateData.amount = parseFloat(amountStr);
    if (dateStr) updateData.date = new Date(dateStr);
    if (typeStr) updateData.type = typeStr as any;
    if (receiptFile) updateData.receiptUrl = receiptUrl;

    const updatedExpense = await ExpenseService.updateExpense(expenseId, updateData);

    return { success: true, expense: updatedExpense };
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { success: false, message: error.message || "Failed to update expense" };
  }
}

export async function deleteExpenseAction(expenseId: string) {
  try {
    const userId = await getUserId();
    
    // Auth validation
    const existingExpense = await prisma.extraExpense.findUnique({
      where: { id: expenseId },
      include: {
        room: {
          select: {
            members: {
              where: { userId },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!existingExpense) {
      return { success: false, message: "Expense not found" };
    }

    if (existingExpense.room.members.length === 0) {
      return { success: false, message: "Unauthorized to delete this expense" };
    }

    await ExpenseService.deleteExpense(expenseId);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { success: false, message: error.message || "Failed to delete expense" };
  }
}
