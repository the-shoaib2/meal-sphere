
import { prisma } from '@/lib/services/prisma';
import { getCurrentPeriod } from '@/lib/utils/period-utils';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

// Optimized: Accepts periodId to avoid DB lookup
export async function calculateBalance(userId: string, roomId: string, periodId: string | null | undefined): Promise<number> {
  // If no active period exists, return 0 (no balance for ended periods)
  if (!periodId) {
    return 0;
  }

  const transactions = await prisma.accountTransaction.findMany({
    where: {
      roomId,
      periodId: periodId,
      OR: [
        { targetUserId: userId },                    // User is the receiver
        {
          AND: [
            { userId: userId },                      // User is the sender
            { targetUserId: userId }                 // AND user is also the target (self-transaction)
          ]
        }
      ],
    },
    select: {
      userId: true,
      targetUserId: true,
      amount: true,
    },
  });

  return transactions.reduce((balance: number, t: { amount: number; targetUserId: string }) => {
    if (t.targetUserId === userId) {
      return balance + t.amount; // Money received (positive)
    }
    return balance;
  }, 0);
}

// Optimized: Accepts periodId
export async function calculateGroupTotalBalance(roomId: string, periodId: string | null | undefined): Promise<number> {
  try {
    if (!periodId) {
      return 0;
    }

    const transactions = await prisma.accountTransaction.findMany({
      where: {
        roomId,
        periodId: periodId,
      },
      select: {
        userId: true,
        targetUserId: true,
        amount: true,
      },
    });

    return transactions.reduce((balance: number, t: { userId: string; targetUserId: string; amount: number }) => {
      if (t.targetUserId === t.userId) {
        return balance + t.amount; // Self-transactions (deposits)
      }
      return balance; // Other transactions don't affect group total
    }, 0);
  } catch (error) {
    console.error('Error calculating group total balance:', error);
    return 0;
  }
}

// Optimized: Accepts periodId
export async function calculateTotalExpenses(roomId: string, periodId: string | null | undefined): Promise<number> {
  try {
    if (!periodId) {
      return 0;
    }

    const aggregated = await prisma.extraExpense.aggregate({
      where: {
        roomId,
        periodId: periodId,
      },
      _sum: { amount: true },
    });

    return aggregated._sum.amount || 0;
  } catch (error) {
    console.error('Error calculating total expenses:', error);
    return 0;
  }
}

// Optimized: Accepts periodId and optional pre-calculated values
export async function calculateMealRate(
  roomId: string,
  periodId: string | null | undefined,
  precalculatedTotalExpenses?: number
): Promise<{ mealRate: number; totalMeals: number; totalExpenses: number }> {
  try {
    if (!periodId) {
      return { mealRate: 0, totalMeals: 0, totalExpenses: 0 };
    }

    // Get total meals in the room for current period
    const totalMeals = await prisma.meal.count({
      where: {
        roomId,
        periodId: periodId, // Use direct ID filter
      },
    });

    // Get total expenses (use pre-calculated if available)
    const totalExpenses = precalculatedTotalExpenses !== undefined
      ? precalculatedTotalExpenses
      : await calculateTotalExpenses(roomId, periodId);

    // Calculate meal rate
    const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

    return { mealRate, totalMeals, totalExpenses };
  } catch (error) {
    console.error('Error calculating meal rate:', error);
    return { mealRate: 0, totalMeals: 0, totalExpenses: 0 };
  }
}

// Optimized: Accepts periodId
export async function calculateUserMealCount(userId: string, roomId: string, periodId: string | null | undefined): Promise<number> {
  try {
    if (!periodId) {
      return 0;
    }

    return await prisma.meal.count({
      where: {
        userId,
        roomId,
        periodId: periodId,
      },
    });
  } catch (error) {
    console.error('Error calculating user meal count:', error);
    return 0;
  }
}

// Optimized: Accepts periodId and mealRate info
export async function calculateAvailableBalance(
  userId: string,
  roomId: string,
  periodId: string | null | undefined,
  mealRateInfo?: { mealRate: number }
): Promise<{
  availableBalance: number;
  totalSpent: number;
  mealCount: number;
  mealRate: number;
}> {
  try {
    // If we don't have mealRate info, fetch it
    const mealRatePromise = mealRateInfo
      ? Promise.resolve({ mealRate: mealRateInfo.mealRate })
      : calculateMealRate(roomId, periodId);

    const [balance, mealCount, mealRateData] = await Promise.all([
      calculateBalance(userId, roomId, periodId),
      calculateUserMealCount(userId, roomId, periodId),
      mealRatePromise,
    ]);

    const mealRate = 'mealRate' in mealRateData ? mealRateData.mealRate : 0;
    const totalSpent = mealCount * mealRate;
    const availableBalance = balance - totalSpent;

    return {
      availableBalance,
      totalSpent,
      mealCount,
      mealRate,
    };
  } catch (error) {
    console.error('Error calculating available balance:', error);
    return {
      availableBalance: 0,
      totalSpent: 0,
      mealCount: 0,
      mealRate: 0,
    };
  }
}

/**
 * Calculates summary for the entire group, including all members' balances.
 * This is an expensive operation and should generally be cached by the caller.
 */
export async function getGroupBalanceSummary(
  roomId: string, 
  includeDetails: boolean,
  prefetchedData?: {
    totalExpenses?: number;
    totalMeals?: number;
    mealRate?: number;
  }
) {
  const cacheKey = `group_balance_summary:${roomId}:${includeDetails}`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      // Now do expensive operations inside cache
      const currentPeriod = await getCurrentPeriod(roomId);
      const periodId = currentPeriod?.id;

      const members = await prisma.roomMember.findMany({
        where: { roomId },
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      });

      // 1. Fetch ALL transactions for the room/period at once
      // Optimization: Fetch raw data once and aggregate in memory to avoid multiple DB calls
      const allTransactions = await prisma.accountTransaction.findMany({
        where: {
          roomId,
          periodId: periodId,
        },
        select: {
          userId: true,
          targetUserId: true,
          amount: true,
        }
      });

      // Calculate aggregated values in memory
      const balanceMap = new Map<string, number>();
      let groupTotalBalance = 0;

      for (const t of allTransactions) {
        // Build balance map (Total Received)
        const currentBalance = balanceMap.get(t.targetUserId) || 0;
        balanceMap.set(t.targetUserId, currentBalance + t.amount);

        // Calculate Group Total Balance (Self-transactions only)
        if (t.userId === t.targetUserId) {
          groupTotalBalance += t.amount;
        }
      }

      // 2. Fetch ALL meal counts for the room/period at once, grouped by userId
      const mealsGrouped = await prisma.meal.groupBy({
        by: ['userId'],
        where: {
          roomId,
          periodId: periodId,
        },
        _count: {
          id: true,
        },
      });

      // Convert to map
      const mealCountMap = new Map<string, number>();
      mealsGrouped.forEach((m) => {
        if (m.userId) mealCountMap.set(m.userId, m._count.id || 0);
      });

      // Calculate group totals efficiently
      
      // 1. Calculate Total Meals from grouped data (No extra DB call needed)
      let totalMeals = prefetchedData?.totalMeals;
      if (totalMeals === undefined) {
         totalMeals = 0;
         mealsGrouped.forEach(m => {
            totalMeals! += (m._count.id || 0); // Non-null assertion safe due to init
         });
      }

      // 2. Calculate Total Expenses (DB call if not prefetched)
      let totalExpenses = prefetchedData?.totalExpenses;
      if (totalExpenses === undefined) {
        totalExpenses = await calculateTotalExpenses(roomId, periodId);
      }

      // 3. Calculate Meal Rate (Pure math now)
      let mealRate = prefetchedData?.mealRate;
      if (mealRate === undefined) {
          mealRate = (totalMeals || 0) > 0 ? (totalExpenses || 0) / (totalMeals || 0) : 0;
      }

      // groupTotalBalance is calculated above

      // Construct the response in memory
      const membersWithBalances = members.map((m: any) => {
        // Use pre-fetched data
        const basicBalance = balanceMap.get(m.userId) || 0;
        const userMealCount = mealCountMap.get(m.userId) || 0;

        if (includeDetails) {
          const totalSpent = userMealCount * (mealRate || 0);
          const availableBalance = basicBalance - totalSpent;

          return {
            id: m.id,
            userId: m.userId,
            roomId: m.roomId,
            role: m.role,
            isCurrent: m.isCurrent,
            isBanned: m.isBanned,
            joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : null,
            user: {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              image: m.user.image,
            },
            balance: basicBalance,
            availableBalance,
            totalSpent,
            mealCount: userMealCount,
            mealRate,
          };
        }

        return {
          id: m.id,
          userId: m.userId,
          roomId: m.roomId,
          role: m.role,
          isCurrent: m.isCurrent,
          isBanned: m.isBanned,
          joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : null,
          user: {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
          },
          balance: basicBalance,
        };
      });

      return {
        members: membersWithBalances,
        groupTotalBalance: Number(groupTotalBalance) || 0,
        totalExpenses: Number(totalExpenses) || 0,
        mealRate: Number(mealRate) || 0,
        totalMeals: Number(totalMeals) || 0,
        netGroupBalance: Number(groupTotalBalance - (totalExpenses || 0)) || 0,
        currentPeriod: currentPeriod ? {
          id: currentPeriod.id,
          name: currentPeriod.name,
          startDate: currentPeriod.startDate ? new Date(currentPeriod.startDate).toISOString() : null,
          endDate: currentPeriod.endDate ? new Date(currentPeriod.endDate).toISOString() : null,
          status: currentPeriod.status,
          isLocked: currentPeriod.isLocked,
        } : null,
      };
    },
    { ttl: CACHE_TTL.ACTIVE_PERIOD }
  );
}

// Transaction Management with Audit Logs

export async function createTransaction(
  data: {
    roomId: string;
    userId: string;       // The creator of the transaction
    targetUserId: string; // The person whose balance is affected
    amount: number;
    type: string;
    description?: string;
    periodId?: string;
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the transaction
    const transaction = await tx.accountTransaction.create({
      data: {
        roomId: data.roomId,
        userId: data.userId, 
        targetUserId: data.targetUserId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        createdBy: data.userId,
        periodId: data.periodId,
      },
    });

    // 2. Create history record (Action: CREATE)
    await tx.transactionHistory.create({
      data: {
        transactionId: transaction.id,
        action: 'CREATE',
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        userId: transaction.userId, // Creator
        targetUserId: transaction.targetUserId,
        roomId: transaction.roomId,
        periodId: transaction.periodId,
        changedBy: data.userId,
      },
    });

    return transaction;
  });
}

export async function updateTransaction(
  transactionId: string,
  data: {
    amount: number;
    description?: string;
    type: string;
    changedBy: string; // User ID performing the update
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current transaction state
    const currentTransaction = await tx.accountTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!currentTransaction) {
      throw new Error('Transaction not found');
    }

    // 2. Create history snapshot of OLD state (Action: UPDATE)
    await tx.transactionHistory.create({
      data: {
        transactionId: currentTransaction.id,
        action: 'UPDATE', // This record preserves the state BEFORE interpretation of 'update'
        amount: currentTransaction.amount,
        type: currentTransaction.type,
        description: currentTransaction.description,
        userId: currentTransaction.userId,
        targetUserId: currentTransaction.targetUserId,
        roomId: currentTransaction.roomId,
        periodId: currentTransaction.periodId,
        changedBy: data.changedBy,
      },
    });

    // 3. Update the transaction
    const updatedTransaction = await tx.accountTransaction.update({
      where: { id: transactionId },
      data: {
        amount: data.amount,
        description: data.description,
        type: data.type,
      },
    });

    return updatedTransaction;
  });
}

export async function deleteTransaction(
  transactionId: string,
  changedBy: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current transaction state
    const currentTransaction = await tx.accountTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!currentTransaction) {
      throw new Error('Transaction not found');
    }

    // 2. Create history snapshot (Action: DELETE)
    await tx.transactionHistory.create({
      data: {
        transactionId: currentTransaction.id,
        action: 'DELETE',
        amount: currentTransaction.amount,
        type: currentTransaction.type,
        description: currentTransaction.description,
        userId: currentTransaction.userId,
        targetUserId: currentTransaction.targetUserId,
        roomId: currentTransaction.roomId,
        periodId: currentTransaction.periodId,
        changedBy: changedBy,
      },
    });

    // 3. Delete the transaction
    await tx.accountTransaction.delete({
      where: { id: transactionId },
    });

    return true;
  });
}
