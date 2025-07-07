import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

const PRIVILEGED_ROLES = [
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

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

    const member = await prisma.roomMember.findFirst({
      where: { userId: session.user.id, roomId },
    });

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    const hasPrivilege = isPrivileged(member.role);
    const targetUserId = userId || session.user.id;

    // Users can only view their own transactions unless they have privileges
    if (targetUserId !== session.user.id && !hasPrivilege) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get current period to check if it's ended
    const currentPeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // If no active period exists, return empty array (no transactions for ended periods)
    if (!currentPeriod) {
      return NextResponse.json([]);
    }

    const whereClause: any = {
      roomId,
      periodId: currentPeriod.id, // Always filter by current period
        OR: [
          { userId: targetUserId },
          { targetUserId: targetUserId },
        ],
    };

    const transactions = await prisma.accountTransaction.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(transactions);

  } catch (error: any) {
    console.error('Error in GET /api/account-balance/transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 