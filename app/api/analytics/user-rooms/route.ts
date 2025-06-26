import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          include: {
            room: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get room IDs the user is a member of
    const roomIds = user.rooms.map((membership) => membership.roomId);

    if (roomIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get room member counts
    const roomMembers = await prisma.roomMember.findMany({
      where: {
        roomId: { in: roomIds },
      },
      select: {
        roomId: true,
        room: {
          select: { name: true },
        },
      },
    });

    const memberCounts = roomMembers.reduce((acc, member) => {
      acc[member.roomId] = (acc[member.roomId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get unique rooms with member counts
    const uniqueRooms = Array.from(new Set(roomIds)).map(roomId => {
      const room = user.rooms.find(membership => membership.roomId === roomId)?.room;
      return {
        id: roomId,
        name: room?.name || 'Unknown Room',
        memberCount: memberCounts[roomId] || 0,
      };
    });

    return NextResponse.json(uniqueRooms);

  } catch (error) {
    console.error('User rooms API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 