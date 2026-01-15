import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's room memberships
    // Avoid 'include: { room: true }' because it crashes if the relation is broken in DB.
    const memberships = await prisma.roomMember.findMany({
      where: { userId: session.user.id },
    });

    // Extract Room IDs
    const memberRoomIds = memberships.map(m => m.roomId);

    if (memberRoomIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch existing rooms manually
    const validRooms = await prisma.room.findMany({
      where: {
        id: { in: memberRoomIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Get room member counts (safe query, no includes needed if we just group by scalar)
    // Actually we need to filter roomIds for member counts too
    const validRoomIds = validRooms.map(r => r.id);

    const roomMembers = await prisma.roomMember.findMany({
      where: {
        roomId: { in: validRoomIds },
      },
      select: {
        roomId: true,
      },
    });

    const memberCounts = roomMembers.reduce((acc, member) => {
      acc[member.roomId] = (acc[member.roomId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Map rooms to response format
    const uniqueRooms = validRooms.map(room => {
      return {
        id: room.id,
        name: room.name || 'Unknown Room',
        memberCount: memberCounts[room.id] || 0,
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
