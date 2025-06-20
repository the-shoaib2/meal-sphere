import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expenseId = params.id;
    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // First, verify the expense exists and belongs to the user's room
    const expense = await prisma.extraExpense.findUnique({
      where: { id: expenseId },
      include: {
        room: {
          select: {
            members: {
              where: { user: { email: session.user.email } },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if the user is a member of the room that the expense belongs to
    if (expense.room.members.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this expense' },
        { status: 403 }
      );
    }

    // Delete the expense
    await prisma.extraExpense.delete({
      where: { id: expenseId }
    });

    return NextResponse.json(
      { message: 'Expense deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
