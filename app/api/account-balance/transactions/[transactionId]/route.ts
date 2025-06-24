import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

const PRIVILEGED_ROLES = [
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
  'MANAGER',
  'MODERATOR',
  'MEAL_MANAGER',
  'MARKET_MANAGER',
];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

async function checkPrivileges(userId: string, roomId: string) {
  const userInRoom = await prisma.roomMember.findFirst({
    where: { userId, roomId },
    select: { role: true },
  });

  if (!userInRoom) {
    throw new Error('Not a member of this room');
  }

  if (!isPrivileged(userInRoom.role)) {
    throw new Error('Insufficient permissions');
  }
}

// PUT: Update a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = params;
    const body = await request.json();
    const { amount, description, type } = body;

    const transaction = await prisma.accountTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await checkPrivileges(session.user.id, transaction.roomId);

    const updatedTransaction = await prisma.accountTransaction.update({
      where: { id: transactionId },
      data: {
        amount: parseFloat(amount),
        description,
        type,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error: any) {
    console.error('Error in PUT /api/account-balance/transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = params;

    const transaction = await prisma.accountTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await checkPrivileges(session.user.id, transaction.roomId);

    await prisma.accountTransaction.delete({
      where: { id: transactionId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/account-balance/transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 