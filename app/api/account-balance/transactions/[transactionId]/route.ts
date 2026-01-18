import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { hasBalancePrivilege, canModifyTransactions, canDeleteTransactions } from '@/lib/auth/balance-permissions';
import { updateTransaction, deleteTransaction } from '@/lib/services/balance-service';

async function checkEditPrivileges(userId: string, roomId: string) {
  const userInRoom = await prisma.roomMember.findFirst({
    where: { userId, roomId },
    select: { role: true },
  });

  if (!userInRoom) {
    throw new Error('Not a member of this room');
  }

  if (!canModifyTransactions(userInRoom.role)) {
    throw new Error('Insufficient permissions');
  }
}

async function checkDeletePrivileges(userId: string, roomId: string) {
  const userInRoom = await prisma.roomMember.findFirst({
    where: { userId, roomId },
    select: { role: true },
  });

  if (!userInRoom) {
    throw new Error('Not a member of this room');
  }

  if (!canDeleteTransactions(userInRoom.role)) {
    throw new Error('Only ADMIN can delete transactions');
  }
}

// PUT: Update a transaction
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await context.params;
    const body = await request.json();
    const { amount, description, type } = body;

    const transaction = await prisma.accountTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await checkEditPrivileges(session.user.id, transaction.roomId);

    const updatedTransaction = await updateTransaction(transaction.id, {
      amount: parseFloat(amount),
      description,
      type,
      changedBy: session.user.id
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
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await context.params;

    const transaction = await prisma.accountTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await checkDeletePrivileges(session.user.id, transaction.roomId);

    await deleteTransaction(transaction.id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/account-balance/transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 