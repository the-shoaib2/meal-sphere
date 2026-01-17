import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { getCurrentPeriod } from '@/lib/utils/period-utils';
import { hasBalancePrivilege, canViewUserBalance } from '@/lib/auth/balance-permissions';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import {
  calculateBalance,
  calculateTotalExpenses,
  calculateMealRate,
  calculateUserMealCount,
  calculateGroupTotalBalance,
  getGroupBalanceSummary
} from '@/lib/services/balance-service';

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

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
      select: { role: true }
    });

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    if (getAll) {
      // Quick permission check first
      if (!hasBalancePrivilege(member.role)) {
         return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const balanceData = await getGroupBalanceSummary(roomId, includeDetails);

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

    // Optimization: Calculate everything in parallel
    // We fetch all necessary data points at once instead of sequential or redundant calls
    const [targetUser, memberRole, userBalance, mealStats] = await Promise.all([
      // 1. User details
      prisma.user.findUnique({ 
        where: { id: targetUserId }, 
        select: { id: true, name: true, image: true, email: true } 
      }),
      // 2. Member role
      prisma.roomMember.findFirst({ 
        where: { userId: targetUserId, roomId }, 
        select: { role: true } 
      }),
      // 3. User's direct balance (transactions)
      calculateBalance(targetUserId, roomId, periodId),
      // 4. Meal stats (only if details needed)
      includeDetails ? (async () => {
         // parallelize sub-tasks for meal stats
         const [count, expenseTotal] = await Promise.all([
            calculateUserMealCount(targetUserId, roomId, periodId),
            calculateTotalExpenses(roomId, periodId)
         ]);
         const { mealRate } = await calculateMealRate(roomId, periodId, expenseTotal);
         return { count, mealRate };
      })() : Promise.resolve(null)
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response: any = {
      user: targetUser,
      balance: userBalance,
      role: memberRole?.role || 'MEMBER',
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

       Object.assign(response, {
         availableBalance,
         totalSpent,
         mealCount: count,
         mealRate
       });
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
