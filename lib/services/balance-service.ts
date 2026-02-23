import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod } from '@/lib/utils/period-utils';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

export type RoomContext = {
  member: {
    id: string;
    role: string;
    isBanned: boolean;
    isCurrent: boolean;
  } | null;
  room: {
    id: string;
    name: string;
    periodMode: string;
    isPrivate: boolean;
  } | null;
  currentPeriod: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date | null;
    status: string;
    isLocked: boolean;
  } | null;
};

/**
 * Consolidates common lookups for financial pages to reduce DB roundtrips.
 */
export async function getRoomContext(userId: string, roomId: string): Promise<RoomContext> {
  const cacheKey = `room-context:${userId}:${roomId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const [member, room, currentPeriod] = await Promise.all([
        prisma.roomMember.findUnique({
          where: { userId_roomId: { userId, roomId } },
          select: { id: true, role: true, isBanned: true, isCurrent: true }
        }),
        prisma.room.findUnique({
          where: { id: roomId },
          select: { id: true, name: true, periodMode: true, isPrivate: true }
        }),
        prisma.mealPeriod.findFirst({
          where: { roomId, status: 'ACTIVE' },
          select: { id: true, name: true, startDate: true, endDate: true, status: true, isLocked: true }
        })
      ]);
      
      return encryptData({ member, room, currentPeriod });
    },
    [cacheKey],
    { revalidate: 60, tags: [`group-${roomId}`, `user-${userId}`, 'context'] }
  );
  
  const decrypted = decryptData(await cachedFn());
  // Ensure dates are parsed back to Date objects if needed, though decryptData might handle it depending on implementation.
  // lib/encryption.ts usually returns JSON.parse.
  return decrypted;
}

// Uses DB Aggregation
export async function calculateBalance(userId: string, roomId: string, periodId: string | null | undefined): Promise<number> {
  // If no active period exists, return 0 (no balance for ended periods)
  if (!periodId) {
    return 0;
  }

  // Calculate Net Balance: (Total Received + Self Deposits) - (Total Sent)
  // Actually, standard logic is just "Sum of amounts where I am the TARGET".
  // Note: If I send money to myself, I am both source and target.
  // If I send to someone else, I am source (balance decreases? NO, usually 'Payment' table handles simple expense. 
  // AccountTransaction is for transfers.
  // If logical balance = Sum of (Target == Me).
  
  const aggregation = await prisma.accountTransaction.aggregate({
    where: {
      roomId,
      periodId: periodId,
      targetUserId: userId
    },
    _sum: {
      amount: true
    }
  });

  // Calculate sent amounts (if negative balance concept exists? usually transactions are positive transfers)
  // Based on previous logic: "return balance + t.amount if target == me". 
  // Previous logic ignored sent amounts entirely?
  // Previous code:
  // if (t.targetUserId === userId) return balance + t.amount;
  // return balance;
  // So it ONLY summed incoming money.
  
  return aggregation._sum.amount || 0;
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

  const cachedFn = unstable_cache(
    async () => {
      const currentPeriod = await getCurrentPeriod(roomId);
      const periodId = currentPeriod?.id;

      // Split into two smaller batches to avoid overwhelming connection pool in Session mode
      const [members, balancesGrouped] = await Promise.all([
        prisma.roomMember.findMany({
          where: { roomId },
          include: { user: { select: { id: true, name: true, image: true, email: true } } },
        }),
        prisma.accountTransaction.groupBy({
          by: ['targetUserId'],
          where: { roomId, periodId: periodId },
          _sum: { amount: true }
        }),
      ]);

      const [groupTotalResult, mealsGrouped, fetchedTotalExpenses] = await Promise.all([
        (prisma as any).$queryRaw`
          SELECT SUM(amount) as total 
          FROM "AccountTransaction" 
          WHERE "roomId" = ${roomId} 
          AND "periodId" = ${periodId} 
          AND "userId" = "targetUserId"
        `,
        prisma.meal.groupBy({
          by: ['userId'],
          where: { roomId, periodId: periodId },
          _count: { id: true },
        }),
        prefetchedData?.totalExpenses === undefined 
          ? calculateTotalExpenses(roomId, periodId)
          : Promise.resolve(prefetchedData.totalExpenses)
      ]);
      
      const balanceMap = new Map<string, number>();
      balancesGrouped.forEach(b => {
          balanceMap.set(b.targetUserId, b._sum.amount || 0);
      });

      const groupTotalBalance = Number((groupTotalResult as any)?.[0]?.total || 0);

      const mealCountMap = new Map<string, number>();
      let totalMeals = prefetchedData?.totalMeals || 0;
      
      if (prefetchedData?.totalMeals === undefined) {
         mealsGrouped.forEach((m: any) => {
            const count = m._count.id || 0;
            if (m.userId) mealCountMap.set(m.userId, count);
            totalMeals += count;
         });
      } else {
         mealsGrouped.forEach((m: any) => {
            if (m.userId) mealCountMap.set(m.userId, m._count.id || 0);
         });
      }

      // 4. Calculate Totals
      let totalExpenses = fetchedTotalExpenses;

      let mealRate = prefetchedData?.mealRate;
      if (mealRate === undefined) {
          mealRate = (totalMeals || 0) > 0 ? (totalExpenses || 0) / (totalMeals || 0) : 0;
      }

      // Construct response
      const membersWithBalances = members.map((m: any) => {
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

      const result = {
        members: membersWithBalances,
        groupTotalBalance: groupTotalBalance,
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
      
      return encryptData(result);
    },
    [cacheKey],
    { 
      revalidate: CACHE_TTL.ACTIVE_PERIOD,
      tags: [`group-${roomId}`, 'balance', `summary-${roomId}`]
    }
  );

  const cachedData = await cachedFn() as any;
  if (typeof cachedData === 'string' && (cachedData.includes(':') || cachedData.length > 50)) {
    try { return decryptData(cachedData); } catch (e) { return cachedData; }
  }
  return cachedData;
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

/**
 * Unified fetcher for Account Balance page SSR
 */
/**
 * Targeted fetcher for the user-specific balance detail page.
 * Avoids fetching the entire group summary.
 */
export async function fetchUserBalanceDetailData(targetUserId: string, groupId: string, viewerUserId: string) {
  const cacheKey = `user-balance-detail-${targetUserId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const { member: viewerMember, room, currentPeriod } = await getRoomContext(viewerUserId, groupId);
      const periodId = currentPeriod?.id;

      if (!room || !viewerMember) throw new Error("Unauthorized");

      // Parallel queries for user-specific data
      const [targetMember, balance, mealCount, mealRateData, transactions, history] = await Promise.all([
        prisma.roomMember.findUnique({
          where: { userId_roomId: { userId: targetUserId, roomId: groupId } },
          include: { user: { select: { id: true, name: true, image: true, email: true } } }
        }),
        calculateBalance(targetUserId, groupId, periodId),
        calculateUserMealCount(targetUserId, groupId, periodId),
        calculateMealRate(groupId, periodId),
        prisma.accountTransaction.findMany({
          where: {
            roomId: groupId,
            periodId: periodId,
            OR: [
              { userId: targetUserId },
              { targetUserId: targetUserId }
            ]
          },
          include: {
            creator: { select: { id: true, name: true, image: true, email: true } },
            targetUser: { select: { id: true, name: true, image: true, email: true } },
            user: { select: { id: true, name: true, image: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }),
        prisma.transactionHistory.findMany({
          where: { 
            roomId: groupId,
            periodId: periodId,
            OR: [
              { userId: targetUserId },
              { targetUserId: targetUserId }
            ]
          },
          include: { changedByUser: { select: { id: true, name: true, image: true, email: true } } },
          orderBy: { changedAt: 'desc' },
          take: 10
        })
      ]);

      if (!targetMember) throw new Error("User not found in group");

      const mealRate = mealRateData.mealRate;
      const totalSpent = mealCount * mealRate;
      const availableBalance = balance - totalSpent;

      const userData = {
        user: targetMember.user,
        balance,
        role: targetMember.role,
        availableBalance,
        totalSpent,
        mealCount,
        mealRate,
        currentPeriod
      };

      const executionTime = performance.now() - start;

      const result = {
        userData,
        transactions,
        history,
        currentPeriod,
        roomData: room,
        viewerRole: viewerMember.role,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey],
    { revalidate: 30, tags: [`user-${targetUserId}`, `group-${groupId}`, 'balance'] }
  );

  return decryptData(await cachedFn());
}

export async function fetchAccountBalanceData(userId: string, groupId: string) {
  const cacheKey = `account-balance-data-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const { member: membership, room: roomData, currentPeriod } = await getRoomContext(userId, groupId);
      const periodId = currentPeriod?.id;

      if (!roomData || !membership) throw new Error("Unauthorized");

      // Fetch summary and transactions in parallel
      const [summary, transactions, history] = await Promise.all([
        getGroupBalanceSummary(groupId, true),
        // Fetch recent transactions for this user
        prisma.accountTransaction.findMany({
          where: {
            roomId: groupId,
            periodId: periodId,
            OR: [
              { userId: userId },
              { targetUserId: userId }
            ]
          },
          include: {
            creator: { select: { id: true, name: true, image: true, email: true } },
            targetUser: { select: { id: true, name: true, image: true, email: true } },
            user: { select: { id: true, name: true, image: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        prisma.transactionHistory.findMany({
          where: { 
            roomId: groupId,
            periodId: periodId,
            OR: [
              { userId: userId },
              { targetUserId: userId }
            ]
          },
          include: { changedByUser: { select: { id: true, name: true, image: true, email: true } } },
          orderBy: { changedAt: 'desc' },
          take: 10
        })
      ]);

      // Extract own balance from summary
      const ownMemberData = (summary as any)?.members?.find((m: any) => m.userId === userId);
      const ownBalance = ownMemberData ? {
        user: ownMemberData.user,
        balance: ownMemberData.balance,
        role: ownMemberData.role,
        availableBalance: ownMemberData.availableBalance,
        totalSpent: ownMemberData.totalSpent,
        mealCount: ownMemberData.mealCount,
        mealRate: ownMemberData.mealRate,
        currentPeriod: summary.currentPeriod
      } : null;

      const executionTime = performance.now() - start;

      const result = {
        summary,
        ownBalance,
        ownTransactions: transactions,
        history,
        currentPeriod: summary?.currentPeriod || currentPeriod,
        roomData,
        userRole: membership.role,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'account-balance-data'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, 'balance'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetch transaction history for a room/user
 */
export async function fetchTransactionHistory(
  roomId: string, 
  userId: string, 
  viewerId: string,
  viewerRole: string,
  periodId?: string
) {
  const cacheKey = `transaction-history-${roomId}-${userId}-${viewerId}-${periodId || 'all'}`;
  
  // ...
  
  const cachedFn = unstable_cache(
    async () => {
      const history = await prisma.transactionHistory.findMany({
        where: { 
          roomId: roomId,
          periodId: periodId || undefined,
          OR: [
            { userId: userId },
            { targetUserId: userId }
          ]
        },
        include: {
          changedByUser: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true
            }
          }
        },
        orderBy: { changedAt: 'desc' },
        take: 50
      });
      return encryptData(history);
    },
    [cacheKey, 'transaction-history'],
    {
      revalidate: 30, // History is immutable but new ones appear
      tags: [`history-${roomId}`, `user-${userId}`]
    }
  );
  
  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetch transactions list with filtering
 */
export async function fetchTransactions(
  roomId: string,
  userId: string, // The target user
  periodId: string | undefined | null,
  activePeriodId: string | undefined // Pass active if known, else it helps optimization
) {
   const cacheKey = `transactions-${roomId}-${userId}-${periodId || 'active'}`;

   const cachedFn = unstable_cache(
     async () => {
       const [sentTransactions, receivedTransactions] = await Promise.all([
           prisma.accountTransaction.findMany({
               where: {
                   roomId,
                   periodId: periodId || undefined, // undefined means "any" in prisma? No.
                   // If periodId is explicit, use it. If null/undefined, api used "activePeriodId".
                   // We need to be precise. 
                   // The API logic was: 
                   // const activePeriodId = periodId || currentPeriod?.id;
                   // if (!activePeriodId) return [];
                   // So we expect the caller to resolve the periodId before calling this if possible, 
                   // or we handle optionality. Let's enforce periodId presence for efficient caching.
                   userId // Sender is this user
               },
               include: {
                   user: { select: { id: true, name: true, image: true, email: true } },
                   targetUser: { select: { id: true, name: true, image: true, email: true } },
                   creator: { select: { id: true, name: true, image: true, email: true } },
               },
               orderBy: { createdAt: 'desc' },
               take: 100 // Reasonable limit
           }),
           prisma.accountTransaction.findMany({
               where: {
                   roomId,
                   periodId: periodId || undefined,
                   targetUserId: userId // Receiver is this user
               },
               include: {
                   user: { select: { id: true, name: true, image: true, email: true } },
                   targetUser: { select: { id: true, name: true, image: true, email: true } },
                   creator: { select: { id: true, name: true, image: true, email: true } },
               },
               orderBy: { createdAt: 'desc' },
               take: 100
           })
       ]);

       const transactions = [...sentTransactions, ...receivedTransactions]
           .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

       return encryptData(transactions);
     },
     [cacheKey, 'transactions-list'],
     {
        revalidate: 30,
        tags: [`transactions-${roomId}`, `user-${userId}`, `period-${periodId}`]
     }
   );

   const encrypted = await cachedFn();
   return decryptData(encrypted);
}
