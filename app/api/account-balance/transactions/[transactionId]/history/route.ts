import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await context.params;

    // Fetch the transaction to verify access rights (must be member of the room)
    const transaction = await prisma.accountTransaction.findUnique({
      where: { id: transactionId },
      include: {
        room: {
            include: {
                members: {
                    where: { userId: session.user.id }
                }
            }
        }
      }
    });

    if (!transaction) {
      // It might be deleted, so we check if any history exists for this ID if we want to support viewing history of deleted items.
      // But for now, let's assume we are viewing history of an existing transaction.
      // If we strictly only allow existing, return 404.
      // But let's check history just in case the user has a direct link or we implement deleted view later.
       const historyExists = await prisma.transactionHistory.findFirst({
           where: { transactionId }
       });
       if (!historyExists) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
       }
       // If history exists but transaction is gone, we still might want to show it.
       // However, we need to verify room membership. We can check the room from the history record.
       const historyRecord = await prisma.transactionHistory.findFirst({
           where: { transactionId },
           select: { roomId: true }
       });
       
       const member = await prisma.roomMember.findFirst({
           where: { userId: session.user.id, roomId: historyRecord?.roomId }
       });
       
       if (!member) {
           return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
       }
    } else {
         if (!transaction.room.members.length) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
         }
    }

    const history = await prisma.transactionHistory.findMany({
      where: { transactionId },
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
      orderBy: { changedAt: 'desc' }
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error in GET /api/account-balance/transactions/[id]/history:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
