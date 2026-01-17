import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService } from '@/lib/services/period-service';
import { prisma } from '@/lib/services/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    try {
      const summary = await PeriodService.calculatePeriodSummary(resolvedParams.id, groupId);

      return NextResponse.json({ summary }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      });
    } catch (dbError: any) {
      // Handle case where database schema hasn't been updated yet
      if (dbError.message?.includes('Unknown table') ||
        dbError.message?.includes('doesn\'t exist') ||
        dbError.message?.includes('MealPeriod')) {
        return NextResponse.json({ error: 'Period not found' }, { status: 404 });
      }
      throw dbError;
    }
  } catch (error: any) {
    if (error.message === 'Period not found') {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }
    if (error.message === 'Period does not belong to the specified group') {
      return NextResponse.json({ error: 'Period does not belong to this group' }, { status: 403 });
    }

    console.error('Error fetching period summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch period summary' },
      { status: 500 }
    );
  }
} 