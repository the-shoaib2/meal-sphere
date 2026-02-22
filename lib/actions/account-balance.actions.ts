"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import {
  calculateBalance,
  calculateTotalExpenses,
  calculateMealRate,
  calculateUserMealCount,
  getGroupBalanceSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from "@/lib/services/balance-service";
import { getCurrentPeriod } from "@/lib/utils/period-utils";
import { hasBalancePrivilege, canViewUserBalance, canModifyTransactions, canDeleteTransactions } from "@/lib/auth/balance-permissions";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getGroupBalanceSummaryAction(roomId: string, includeDetails: boolean = false) {
  try {
    const userId = await getUserId();
    const member = await prisma.roomMember.findFirst({
      where: { userId, roomId },
      select: { role: true },
    });

    if (!member) {
      return { success: false, message: "You are not a member of this room" };
    }

    if (!hasBalancePrivilege(member.role)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const data = await getGroupBalanceSummary(roomId, includeDetails);
    return { success: true, summary: data };
  } catch (error: any) {
    console.error("Error in getGroupBalanceSummaryAction:", error);
    return { success: false, message: error.message || "Failed to fetch group balance summary" };
  }
}

export async function getUserBalanceAction(roomId: string, targetUserId?: string, includeDetails: boolean = false) {
  try {
    const userId = await getUserId();
    const resolvedTargetUserId = targetUserId || userId;

    const member = await prisma.roomMember.findFirst({
      where: { userId, roomId },
      select: { role: true },
    });

    if (!member) {
      return { success: false, message: "You are not a member of this room" };
    }

    if (!canViewUserBalance(member.role, userId, resolvedTargetUserId)) {
      return { success: false, message: "Insufficient permissions to view this balance" };
    }

    const currentPeriod = await getCurrentPeriod(roomId);
    const periodId = currentPeriod?.id;

    const [targetUser, memberRole, userBalance, mealStats] = await Promise.all([
      prisma.user.findUnique({ where: { id: resolvedTargetUserId }, select: { id: true, name: true, image: true, email: true } }),
      prisma.roomMember.findFirst({ where: { userId: resolvedTargetUserId, roomId }, select: { role: true } }),
      calculateBalance(resolvedTargetUserId, roomId, periodId),
      includeDetails ? (async () => {
        const [count, expenseTotal] = await Promise.all([
          calculateUserMealCount(resolvedTargetUserId, roomId, periodId),
          calculateTotalExpenses(roomId, periodId)
        ]);
        const { mealRate } = await calculateMealRate(roomId, periodId, expenseTotal);
        return { count, mealRate };
      })() : Promise.resolve(null)
    ]);

    if (!targetUser) {
      return { success: false, message: "User not found" };
    }

    const response: any = {
      user: targetUser,
      balance: userBalance,
      role: memberRole?.role || "MEMBER",
      currentPeriod: currentPeriod ? {
        id: currentPeriod.id,
        name: currentPeriod.name,
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        status: currentPeriod.status,
        isLocked: currentPeriod.isLocked,
      } : null,
    };

    if (includeDetails && mealStats) {
      const { count, mealRate } = mealStats;
      const totalSpent = count * mealRate;
      const availableBalance = userBalance - totalSpent;
      Object.assign(response, { availableBalance, totalSpent, mealCount: count, mealRate });
    }

    return { success: true, data: response };
  } catch (error: any) {
    console.error("Error in getUserBalanceAction:", error);
    return { success: false, message: error.message || "Failed to fetch user balance" };
  }
}

export async function createTransactionAction(data: {
  roomId: string;
  targetUserId: string;
  amount: number;
  type: string;
  description?: string;
}) {
  try {
    const userId = await getUserId();
    const { roomId, targetUserId, amount, type, description } = data;

    const member = await prisma.roomMember.findFirst({
      where: { userId, roomId },
      select: { role: true },
    });

    if (!member) {
      return { success: false, message: "You are not a member of this room" };
    }

    if (!hasBalancePrivilege(member.role)) {
      if (type !== 'PAYMENT') {
        return { success: false, message: "Members can only create payment transactions." };
      }
      if (userId !== targetUserId && userId !== data.targetUserId) {
         // Wait, the API checked if userId !== body.userId...
         // "You can only make payments for yourself."
         // Actually, if target user is different, they are paying to privileged member.
      }
      const targetMember = await prisma.roomMember.findFirst({ where: { userId: targetUserId, roomId } });
      if (!targetMember || !hasBalancePrivilege(targetMember.role)) {
        return { success: false, message: "Payments can only be made to privileged members." };
      }
    }

    const currentPeriod = await getCurrentPeriod(roomId);

    const newTransaction = await createTransaction({
      roomId,
      userId,
      targetUserId,
      amount,
      type,
      description,
      periodId: currentPeriod?.id,
    });

    return { success: true, transaction: newTransaction };
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return { success: false, message: error.message || "Failed to create transaction" };
  }
}

export async function updateTransactionAction(transactionId: string, data: { amount: number; description?: string; type: string }) {
  try {
    const userId = await getUserId();
    const transaction = await prisma.accountTransaction.findUnique({ where: { id: transactionId } });
    
    if (!transaction) return { success: false, message: "Transaction not found" };

    const userInRoom = await prisma.roomMember.findFirst({ where: { userId, roomId: transaction.roomId }, select: { role: true } });
    if (!userInRoom || !canModifyTransactions(userInRoom.role)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const updated = await updateTransaction(transactionId, { ...data, changedBy: userId });
    return { success: true, transaction: updated };
  } catch (error: any) {
    console.error("Error updating transaction:", error);
    return { success: false, message: error.message || "Failed to update transaction" };
  }
}

export async function deleteTransactionAction(transactionId: string) {
  try {
    const userId = await getUserId();
    const transaction = await prisma.accountTransaction.findUnique({ where: { id: transactionId } });
    
    if (!transaction) return { success: false, message: "Transaction not found" };

    const userInRoom = await prisma.roomMember.findFirst({ where: { userId, roomId: transaction.roomId }, select: { role: true } });
    if (!userInRoom || !canDeleteTransactions(userInRoom.role)) {
      return { success: false, message: "Only ADMIN can delete transactions" };
    }

    await deleteTransaction(transactionId, userId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return { success: false, message: error.message || "Failed to delete transaction" };
  }
}

export async function getAccountHistoryAction(roomId: string, targetUserId: string, periodId?: string, cursor?: string, limit: number = 10) {
  try {
    const userId = await getUserId();
    const member = await prisma.roomMember.findFirst({ where: { userId, roomId }, select: { role: true } });
    
    if (!member || !canViewUserBalance(member.role, userId, targetUserId)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const history = await prisma.transactionHistory.findMany({
      where: { 
        roomId,
        periodId: periodId || undefined,
        OR: [{ userId: targetUserId }, { targetUserId }]
      },
      include: {
        changedByUser: { select: { id: true, name: true, image: true, email: true } }
      },
      orderBy: { changedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    let nextCursor: string | undefined = undefined;
    if (history.length > limit) {
      const nextItem = history.pop();
      nextCursor = nextItem?.id;
    }

    return { success: true, items: history, nextCursor };
  } catch (error: any) {
    console.error("Error fetching history:", error);
    return { success: false, message: error.message || "Failed to fetch account history" };
  }
}

export async function getTransactionsAction(roomId: string, targetUserId: string, periodId?: string, cursor?: string, limit: number = 10) {
  try {
    const userId = await getUserId();
    const member = await prisma.roomMember.findFirst({ where: { userId, roomId } });

    if (!member || !canViewUserBalance(member.role, userId, targetUserId)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const activePeriodId = periodId || (await getCurrentPeriod(roomId))?.id;
    if (!activePeriodId) {
      return { success: true, items: [], nextCursor: undefined };
    }

    const dateFilter = cursor ? { createdAt: { lt: new Date(cursor) } } : {};

    const [sent, received] = await Promise.all([
        prisma.accountTransaction.findMany({
            where: { roomId, periodId: activePeriodId, userId: targetUserId, ...dateFilter },
            include: { user: true, targetUser: true, creator: true },
            orderBy: { createdAt: 'desc' },
            take: limit + 1
        }),
        prisma.accountTransaction.findMany({
            where: { roomId, periodId: activePeriodId, targetUserId: targetUserId, ...dateFilter },
            include: { user: true, targetUser: true, creator: true },
            orderBy: { createdAt: 'desc' },
            take: limit + 1
        })
    ]);

    const allTransactions = [...sent, ...received].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    let nextCursor: string | undefined = undefined;
    const hasNextPage = allTransactions.length > limit;
    const items = allTransactions.slice(0, limit);
    
    if (hasNextPage) {
        nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return { success: true, items, nextCursor };
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return { success: false, message: error.message || "Failed to fetch transactions" };
  }
}
