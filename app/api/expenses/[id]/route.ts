import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth/auth';
import { ExpenseType } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: expenseId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const description = formData.get('description') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const date = new Date(formData.get('date') as string);
    const type = formData.get('type') as ExpenseType;
    const receipt = formData.get('receipt') as File | null;

    // Verify the expense exists and belongs to the user's room
    const existingExpense = await prisma.extraExpense.findUnique({
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

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if the user is a member of the room that the expense belongs to
    if (existingExpense.room.members.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized to update this expense' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      description,
      amount,
      date,
      type,
    };

    // Handle receipt update if provided
    let receiptUrl = existingExpense.receiptUrl;
    if (receipt) {
      // In a real app, you would upload the file to storage and get the URL
      // For now, we'll just keep the existing URL
      console.log('New receipt uploaded, but storage integration is not implemented');
    }

    // Update the expense and corresponding account transaction in a transaction
    const updatedExpense = await prisma.$transaction(async (tx) => {
      // Update the expense
      const expense = await tx.extraExpense.update({
        where: { id: expenseId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Update the corresponding account transaction
      await tx.accountTransaction.updateMany({
        where: {
          roomId: existingExpense.roomId,
          userId: existingExpense.userId,
          targetUserId: existingExpense.userId,
          amount: -existingExpense.amount, // Old negative amount
          type: 'EXPENSE',
          description: `Expense: ${existingExpense.description}`,
        },
        data: {
          amount: -amount, // New negative amount
          description: `Expense: ${description}`,
        }
      });

      return expense;
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: expenseId } = await params;
  
  if (!expenseId) {
    return NextResponse.json(
      { error: 'Expense ID is required' },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Delete the expense and corresponding account transaction in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the expense
      await tx.extraExpense.delete({
        where: { id: expenseId }
      });

      // Find and delete the corresponding account transaction
      await tx.accountTransaction.deleteMany({
        where: {
          roomId: expense.roomId,
          userId: expense.userId,
          targetUserId: expense.userId,
          amount: -expense.amount, // Negative amount
          type: 'EXPENSE',
          description: `Expense: ${expense.description}`,
        }
      });
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
