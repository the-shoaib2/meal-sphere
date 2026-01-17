import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { hasBalancePrivilege, canViewUserBalance } from '@/lib/auth/balance-permissions';

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// GET: /api/account-balance/transactions?roomId=...&userId=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');
    const periodId = searchParams.get('periodId');

    if (!roomId || !userId) {
      return NextResponse.json({ error: 'Room ID and User ID are required' }, { status: 400 });
    }

    // Optimization: Run Member Check and Period Fetch in parallel
    const [member, currentPeriod] = await Promise.all([
      prisma.roomMember.findFirst({
        where: { userId: session.user.id, roomId },
      }),
      prisma.mealPeriod.findFirst({
        where: { roomId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    const targetUserId = userId || session.user.id;

    // Users can only view their own transactions unless they have privileges
    if (!canViewUserBalance(member.role, session.user.id, targetUserId)) {
      return NextResponse.json({ error: 'Insufficient permissions to view these transactions' }, { status: 403 });
    }

    // Use requested periodId or fallback to current active.
    // Optimization: Allow fetching past period transactions too if periodId is passed
    const activePeriodId = periodId || currentPeriod?.id;

    // If no period context (no id passed and no active), return empty
    if (!activePeriodId) {
      return NextResponse.json([]);
    }

    const whereClause: any = {
      roomId,
      periodId: activePeriodId,
      OR: [
        { userId: targetUserId },
        { targetUserId: targetUserId },
      ],
    };

    const transactions = await prisma.accountTransaction.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, image: true, email: true },
        },
        creator: {
          select: { id: true, name: true, image: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Cache shorter for active period, longer for past periods (if periodId was explicit)
    const isHistorical = periodId && periodId !== currentPeriod?.id;
    return NextResponse.json(transactions, {
      headers: { 
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/account-balance/transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 