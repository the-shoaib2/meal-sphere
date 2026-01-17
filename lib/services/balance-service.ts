
import { prisma } from '@/lib/services/prisma';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

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
export async function getGroupBalanceSummary(roomId: string, includeDetails: boolean) {
  // Now do expensive operations inside cache
  const currentPeriod = await getCurrentPeriod(roomId);
  const periodId = currentPeriod?.id;

  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  });

  // 1. Fetch ALL transactions for the room/period at once, grouped by targetUserId
  const transactionsGrouped = await prisma.accountTransaction.groupBy({
    by: ['targetUserId'],
    where: {
      roomId,
      periodId: periodId,
    },
    _sum: {
      amount: true,
    },
  });

  // Convert to map for O(1) lookup
  const balanceMap = new Map<string, number>();
  transactionsGrouped.forEach((t) => {
    if (t.targetUserId) balanceMap.set(t.targetUserId, t._sum.amount || 0);
  });

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
  // We calculate total expenses first, then pass it to meal rate calculation
  const totalExpenses = await calculateTotalExpenses(roomId, periodId);
  const { mealRate, totalMeals } = await calculateMealRate(roomId, periodId, totalExpenses);

  const groupTotalBalance = await calculateGroupTotalBalance(roomId, periodId);

  // Construct the response in memory
  const membersWithBalances = members.map((m: any) => {
    // Use pre-fetched data
    const basicBalance = balanceMap.get(m.userId) || 0;
    const userMealCount = mealCountMap.get(m.userId) || 0;

    if (includeDetails) {
      const totalSpent = userMealCount * mealRate;
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
    netGroupBalance: Number(groupTotalBalance - totalExpenses) || 0,
    currentPeriod: currentPeriod ? {
      id: currentPeriod.id,
      name: currentPeriod.name,
      startDate: currentPeriod.startDate ? new Date(currentPeriod.startDate).toISOString() : null,
      endDate: currentPeriod.endDate ? new Date(currentPeriod.endDate).toISOString() : null,
      status: currentPeriod.status,
      isLocked: currentPeriod.isLocked,
    } : null,
  };
}
