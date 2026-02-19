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
  const userId = searchParams.get('userId') || session.user.id;

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const autoSettings = await prisma.autoMealSettings.upsert({
      where: {
        userId_roomId: {
          userId: userId,
          roomId: roomId
        }
      },
      update: body,
      create: {
        ...body,
        userId: userId,
        roomId: roomId
      }
    });
    return NextResponse.json(autoSettings);
  } catch (error) {
    console.error('Error in /api/meals/auto-settings PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
