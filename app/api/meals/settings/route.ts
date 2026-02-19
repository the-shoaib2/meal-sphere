import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  // Check if user is admin/manager
  const roomMember = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: { userId: session.user.id, roomId: roomId }
    }
  });

  if (!roomMember || !['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(roomMember.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const settings = await prisma.mealSettings.upsert({
      where: { roomId: roomId },
      update: body,
      create: {
        ...body,
        roomId: roomId
      }
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in /api/meals/settings PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
