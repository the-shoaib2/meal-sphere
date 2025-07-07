import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { getPeriodAwareWhereClause, validateActivePeriod, getCurrentPeriod } from '@/lib/period-utils';

const PRIVILEGED_ROLES = [
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

async function calculateBalance(userId: string, roomId: string): Promise<number> {
  // Get current period for filtering
  const currentPeriod = await getCurrentPeriod(roomId);
  
  // If no active period exists, return 0 (no balance for ended periods)
  if (!currentPeriod || currentPeriod.status !== 'ACTIVE') {
    return 0;
  }

  const transactions = await prisma.accountTransaction.findMany({
    where: {
      roomId,
      periodId: currentPeriod.id,
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

  return transactions.reduce((balance, t) => {
    if (t.targetUserId === userId) {
      return balance + t.amount; // Money received (positive)
    }
    return balance;
  }, 0);
}

async function calculateGroupTotalBalance(roomId: string): Promise<number> {
  try {
    // Get current period for filtering
    const currentPeriod = await getCurrentPeriod(roomId);
    
    // If no active period exists, return 0 (no balance for ended periods)
    if (!currentPeriod || currentPeriod.status !== 'ACTIVE') {
      return 0;
    }

    const transactions = await prisma.accountTransaction.findMany({
      where: { 
        roomId,
        periodId: currentPeriod.id,
      },
      select: {
        userId: true,
        targetUserId: true,
        amount: true,
      },
    });

    return transactions.reduce((balance, t) => {
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

async function calculateTotalExpenses(roomId: string): Promise<number> {
  try {
    // Get period-aware where clause
    const periodFilter = await getPeriodAwareWhereClause(roomId, {});
    
    // If no active period, return 0
    if (periodFilter.id === null) {
      return 0;
    }

    const expenses = await prisma.extraExpense.findMany({
      where: { 
        roomId,
        periodId: periodFilter.periodId,
      },
      select: { amount: true },
    });

    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  } catch (error) {
    console.error('Error calculating total expenses:', error);
    return 0;
  }
}

async function calculateMealRate(roomId: string): Promise<{ mealRate: number; totalMeals: number; totalExpenses: number }> {
  try {
    // Get period-aware where clause for meals
    const periodFilter = await getPeriodAwareWhereClause(roomId, {});
    
    // If no active period, return 0
    if (periodFilter.id === null) {
      return { mealRate: 0, totalMeals: 0, totalExpenses: 0 };
    }

    // Get total meals in the room for current period
    const totalMeals = await prisma.meal.count({
      where: { 
        roomId,
        periodId: periodFilter.periodId,
      },
    });

    // Get total expenses
    const totalExpenses = await calculateTotalExpenses(roomId);

    // Calculate meal rate
    const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

    return { mealRate, totalMeals, totalExpenses };
  } catch (error) {
    console.error('Error calculating meal rate:', error);
    return { mealRate: 0, totalMeals: 0, totalExpenses: 0 };
  }
}

async function calculateUserMealCount(userId: string, roomId: string): Promise<number> {
  try {
    // Get period-aware where clause
    const periodFilter = await getPeriodAwareWhereClause(roomId, {});
    
    // If no active period, return 0
    if (periodFilter.id === null) {
      return 0;
    }

    return await prisma.meal.count({
      where: { 
        userId, 
        roomId,
        periodId: periodFilter.periodId,
      },
    });
  } catch (error) {
    console.error('Error calculating user meal count:', error);
    return 0;
  }
}

async function calculateAvailableBalance(userId: string, roomId: string): Promise<{
  availableBalance: number;
  totalSpent: number;
  mealCount: number;
  mealRate: number;
}> {
  try {
    const [balance, mealCount, { mealRate }] = await Promise.all([
      calculateBalance(userId, roomId),
      calculateUserMealCount(userId, roomId),
      calculateMealRate(roomId),
    ]);

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

    const hasPrivilege = isPrivileged(member.role);

    if (getAll) {
      if (!hasPrivilege) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      
      const members = await prisma.roomMember.findMany({
        where: { roomId },
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      });

      // Calculate group totals
      const [groupTotalBalance, totalExpenses, { mealRate, totalMeals }] = await Promise.all([
        calculateGroupTotalBalance(roomId),
        calculateTotalExpenses(roomId),
        calculateMealRate(roomId),
      ]);

      const membersWithBalances = await Promise.all(
        members.map(async (m) => {
          const basicBalance = await calculateBalance(m.userId, roomId);
          
          if (includeDetails) {
            const availableBalanceData = await calculateAvailableBalance(m.userId, roomId);
            return {
              ...m,
              balance: basicBalance,
              ...availableBalanceData,
            };
          }
          
          return {
            ...m,
            balance: basicBalance,
          };
        })
      );

          // Get current period info
    const currentPeriod = await getCurrentPeriod(roomId);
    
    const response: any = {
      members: membersWithBalances,
      groupTotalBalance,
      totalExpenses,
      mealRate,
      totalMeals,
      netGroupBalance: groupTotalBalance - totalExpenses,
      currentPeriod: currentPeriod ? {
        id: currentPeriod.id,
        name: currentPeriod.name,
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        status: currentPeriod.status,
        isLocked: currentPeriod.isLocked,
      } : null,
    };
      
      return NextResponse.json(response);
    }

    const targetUserId = userId || session.user.id;
    if (targetUserId !== session.user.id && !hasPrivilege) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const [targetUser, balance, availableBalanceData, currentPeriod] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true, image: true, email: true } }),
      calculateBalance(targetUserId, roomId),
      includeDetails ? calculateAvailableBalance(targetUserId, roomId) : null,
      getCurrentPeriod(roomId),
    ]);
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response: any = {
      user: targetUser,
      balance,
      currentPeriod: currentPeriod ? {
        id: currentPeriod.id,
        name: currentPeriod.name,
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        status: currentPeriod.status,
        isLocked: currentPeriod.isLocked,
      } : null,
    };

    if (includeDetails && availableBalanceData) {
      Object.assign(response, availableBalanceData);
    }

    return NextResponse.json(response);

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

    // Admins can create transactions for anyone. Regular members can only create PAYMENTS for themselves to admins.
    if (!isPrivileged(member.role)) {
      if (type !== 'PAYMENT') {
        return NextResponse.json({ error: 'Members can only create payment transactions.' }, { status: 403 });
      }
      if (session.user.id !== body.userId) {
         return NextResponse.json({ error: 'You can only make payments for yourself.' }, { status: 403 });
      }
      const targetMember = await prisma.roomMember.findFirst({ where: { userId: targetUserId, roomId }});
      if (!targetMember || !isPrivileged(targetMember.role)) {
        return NextResponse.json({ error: 'Payments can only be made to privileged members.'}, { status: 403});
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

// No PUT and DELETE for this route, handled in [transactionId] route 