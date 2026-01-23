import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { canViewUserBalance } from '@/lib/auth/balance-permissions';

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// GET: /api/account-balance/transactions?roomId=...&userId=...
// GET: /api/account-balance/transactions?roomId=...&userId=...&cursor=...&limit=...
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
    const cursor = searchParams.get('cursor'); // timestamp
    const limit = parseInt(searchParams.get('limit') || '10');

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
    const activePeriodId = periodId || currentPeriod?.id;

    // If no period context (no id passed and no active), return empty
    if (!activePeriodId) {
      return NextResponse.json({ items: [], nextCursor: undefined });
    }

    const dateFilter = cursor ? { createdAt: { lt: new Date(cursor) } } : {};

    // Optimization: Split complex OR query into two index-optimized queries
    const [sentTransactions, receivedTransactions] = await Promise.all([
        prisma.accountTransaction.findMany({
            where: {
                roomId,
                periodId: activePeriodId,
                userId: targetUserId,
                ...dateFilter
            },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
                targetUser: { select: { id: true, name: true, image: true, email: true } },
                creator: { select: { id: true, name: true, image: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1
        }),
        prisma.accountTransaction.findMany({
            where: {
                roomId,
                periodId: activePeriodId,
                targetUserId: targetUserId,
                ...dateFilter
            },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
                targetUser: { select: { id: true, name: true, image: true, email: true } },
                creator: { select: { id: true, name: true, image: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1
        })
    ]);

    // Merge and sort in memory
    const allTransactions = [...sentTransactions, ...receivedTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let nextCursor: string | undefined = undefined;
    
    // We fetched (limit + 1) from BOTH, so we have potentially 2*(limit+1) items.
    // We only need the top (limit + 1) to determine if there is a next page for the UI.
    // Actually, we return 'limit' items, and if we have more, we set nextCursor.
    
    const hasNextPage = allTransactions.length > limit;
    const items = allTransactions.slice(0, limit);
    
    if (hasNextPage) {
        // The cursor for the next page is the createdAt of the last item in the current PAGE
        // ensuring the next fetch gets items older than this one.
        nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return NextResponse.json({
        items,
        nextCursor
    }, {
      headers: { 
        'Cache-Control': 'no-store',
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/account-balance/transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 