import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth/auth';
import { ExpenseType } from '@prisma/client';

export async function PATCH(
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

    // Update the expense
    const updatedExpense = await prisma.extraExpense.update({
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
  { params }: { params: { id: string } }
) {
  const expenseId = params.id;
  
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
