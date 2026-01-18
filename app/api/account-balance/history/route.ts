import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { hasBalancePrivilege, canViewUserBalance } from '@/lib/auth/balance-permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');

    if (!userId || !roomId) {
      return NextResponse.json({ error: 'Missing userId or roomId' }, { status: 400 });
    }

    const member = await prisma.roomMember.findFirst({
      where: { userId: session.user.id, roomId },
      select: { role: true }
    });

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    // Permission check: Can view own history or if privileged
    if (!canViewUserBalance(member.role, session.user.id, userId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const history = await prisma.transactionHistory.findMany({
      where: { 
        userId: userId,
        roomId: roomId
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
      take: 50 // Limit to last 50 actions for performance
    });

    return NextResponse.json(history);

  } catch (error: any) {
    console.error('Error in GET /api/account-balance/history:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
