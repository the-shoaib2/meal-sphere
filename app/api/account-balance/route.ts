import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { getCurrentPeriod } from '@/lib/utils/period-utils';
import { hasBalancePrivilege, canViewUserBalance } from '@/lib/auth/balance-permissions';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// Optimized: Accepts periodId to avoid DB lookup
async function calculateBalance(userId: string, roomId: string, periodId: string | null | undefined): Promise<number> {
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
async function calculateGroupTotalBalance(roomId: string, periodId: string | null | undefined): Promise<number> {
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
async function calculateTotalExpenses(roomId: string, periodId: string | null | undefined): Promise<number> {
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
async function calculateMealRate(
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
async function calculateUserMealCount(userId: string, roomId: string, periodId: string | null | undefined): Promise<number> {
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
async function calculateAvailableBalance(
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

// GET: /api/account-balance?roomId=...&userId=...&all=true&includeDetails=true
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');
    const getAll = searchParams.get('all') === 'true';
    const includeDetails = searchParams.get('includeDetails') === 'true';

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const member = await prisma.roomMember.findFirst({
      where: { userId: session.user.id, roomId },
    });

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    if (getAll) {
      // Quick permission check first
      const member = await prisma.roomMember.findFirst({
        where: { userId: session.user.id, roomId },
        select: { role: true }
      });

      if (!member || !hasBalancePrivilege(member.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Cache key without periodId to avoid expensive lookup before cache check
      const cacheKey = `balance:all:${roomId}:user=${session.user.id}:details=${includeDetails}`;

      const balanceData = await cacheGetOrSet(
        cacheKey,
        async () => {
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
      transactionsGrouped.forEach((t: { targetUserId: string; _sum: { amount: number | null } }) => {
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
      mealsGrouped.forEach((m: { userId: string; _count: { id: number } }) => {
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
    },
    { ttl: CACHE_TTL.CALCULATIONS_ACTIVE } // 3 minutes
  );

      return NextResponse.json(balanceData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        },
      });
    }

    // For single user balance (non-cached path), get period now
    const currentPeriod = await getCurrentPeriod(roomId);
    const periodId = currentPeriod?.id;

    const targetUserId = userId || session.user.id;
    
    // Strict permission check: users can only view their own balance unless they have privilege
    if (!canViewUserBalance(member?.role, session.user.id, targetUserId)) {
      return NextResponse.json({ error: 'Insufficient permissions to view this balance' }, { status: 403 });
    }

    // Optimization: Calculate everything in parallel, passing the pre-fetched periodId
    // For single user, we may need meal rate if includeDetails is true
    let availableBalanceData: any = null;

    if (includeDetails) {
      availableBalanceData = await calculateAvailableBalance(targetUserId, roomId, periodId);
    }

    const [targetUser, balance, targetMember] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true, image: true, email: true } }),
      calculateBalance(targetUserId, roomId, periodId),
      prisma.roomMember.findFirst({ where: { userId: targetUserId, roomId }, select: { role: true } }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response: any = {
      user: targetUser,
      balance,
      role: targetMember?.role || 'MEMBER', // Include the user's role in the group
      currentPeriod: currentPeriod ? {
        id: currentPeriod.id,
        name: currentPeriod.name,
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        status: currentPeriod.status,
        isLocked: currentPeriod.isLocked,
      } : null,
    };

    if (availableBalanceData) {
      Object.assign(response, availableBalanceData);
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/account-balance:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId, targetUserId, amount, type, description } = body;

    if (!roomId || !targetUserId || amount === undefined || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const member = await prisma.roomMember.findFirst({
      where: { userId: session.user.id, roomId },
      select: { role: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    // Privileged users can create transactions for anyone. Regular members can only create PAYMENTS for themselves to privileged users.
    if (!hasBalancePrivilege(member.role)) {
      if (type !== 'PAYMENT') {
        return NextResponse.json({ error: 'Members can only create payment transactions.' }, { status: 403 });
      }
      if (session.user.id !== body.userId) {
        return NextResponse.json({ error: 'You can only make payments for yourself.' }, { status: 403 });
      }
      const targetMember = await prisma.roomMember.findFirst({ where: { userId: targetUserId, roomId } });
      if (!targetMember || !hasBalancePrivilege(targetMember.role)) {
        return NextResponse.json({ error: 'Payments can only be made to privileged members.' }, { status: 403 });
      }
    }

    // Get current period for the room
    const currentPeriod = await getCurrentPeriod(roomId);

    const newTransaction = await prisma.accountTransaction.create({
      data: {
        roomId,
        userId: session.user.id, // Who is creating the transaction
        targetUserId,           // Who is the target of the funds
        amount: parseFloat(amount),
        type,
        description,
        createdBy: session.user.id, // Audit field
        periodId: currentPeriod?.id, // Associate with current period
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/account-balance:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
