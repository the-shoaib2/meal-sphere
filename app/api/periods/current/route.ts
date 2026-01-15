import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService } from '@/lib/period-service';
import { prisma } from '@/lib/prisma';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Verify user has access to this group
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }

    try {
      const currentPeriod = await PeriodService.getCurrentPeriod(groupId);
      return NextResponse.json({ currentPeriod }, {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300'
        }
      });
    } catch (dbError: any) {
      // Handle case where database schema hasn't been updated yet
      if (dbError.message?.includes('Unknown table') ||
        dbError.message?.includes('doesn\'t exist') ||
        dbError.message?.includes('MealPeriod')) {
        return NextResponse.json({ currentPeriod: null });
      }
      throw dbError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch current period' },
      { status: 500 }
    );
  }
} 
