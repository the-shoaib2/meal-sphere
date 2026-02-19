import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/services/prisma';

type RouteParams = { id: string };
type RouteContext = { params: Promise<RouteParams> };

// GET is disabled. Use direct SSR fetching via prisma in the page component.

export async function PUT(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, date } = body;

    // First, get the existing meal to check permissions
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Check if the user is the owner of the meal or an admin
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: existingMeal.roomId,
        },
      },
    });

    if (!roomMember || (roomMember.role !== 'ADMIN' && existingMeal.userId !== session.user.id)) {
      return NextResponse.json(
        { error: 'You do not have permission to update this meal' },
        { status: 403 }
      );
    }

    // Update the meal
    const updatedMeal = await prisma.meal.update({
      where: { id },
      data: {
        type,
        date: date ? new Date(date) : undefined,
      },
    });

    return NextResponse.json(updatedMeal);
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, get the existing meal to check permissions
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Check if the user is the owner of the meal or an admin
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: existingMeal.roomId,
        },
      },
    });

    if (!roomMember || (roomMember.role !== 'ADMIN' && existingMeal.userId !== session.user.id)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this meal' },
        { status: 403 }
      );
    }

    // Delete the meal
    await prisma.meal.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}
