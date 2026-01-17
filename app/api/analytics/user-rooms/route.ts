import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cache key based on user ID
    const cacheKey = `analytics:user-rooms:${session.user.id}`;

    const uniqueRooms = await cacheGetOrSet(
      cacheKey,
      async () => {
        // Get user's room memberships
        const memberships = await prisma.roomMember.findMany({
          where: { userId: session.user.id },
        });

        // Extract Room IDs
        const memberRoomIds = memberships.map(m => m.roomId);

        if (memberRoomIds.length === 0) {
          return [];
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

        // Get room member counts
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
        return validRooms.map(room => ({
          id: room.id,
          name: room.name || 'Unknown Room',
          memberCount: memberCounts[room.id] || 0,
        }));
      },
      { ttl: CACHE_TTL.ANALYTICS } // 5 minutes
    );

    return NextResponse.json(uniqueRooms);

  } catch (error) {
    console.error('User rooms API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
