import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService } from '@/lib/period-service';
import { prisma } from '@/lib/prisma';

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
      const period = await PeriodService.getPeriod(resolvedParams.id, groupId);
      if (!period) {
        return NextResponse.json({ error: 'Period not found' }, { status: 404 });
      }

      return NextResponse.json({ period });
    } catch (dbError: any) {
      // Handle case where database schema hasn't been updated yet
      if (dbError.message?.includes('Unknown table') || 
          dbError.message?.includes('doesn\'t exist') ||
          dbError.message?.includes('MealPeriod')) {
        return NextResponse.json({ error: 'Period not found' }, { status: 404 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching period:', error);
    return NextResponse.json(
      { error: 'Failed to fetch period' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, endDate, groupId } = body;

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
      let result;
      switch (action) {
        case 'end':
          result = await PeriodService.endPeriod(groupId, session.user.id, endDate ? new Date(endDate) : undefined);
          break;
        case 'lock':
          result = await PeriodService.lockPeriod(groupId, session.user.id, resolvedParams.id);
          break;
        case 'unlock':
          result = await PeriodService.unlockPeriod(
            groupId,
            session.user.id,
            resolvedParams.id,
            body.status || 'ENDED'
          );
          break;
        case 'archive':
          result = await PeriodService.archivePeriod(groupId, session.user.id, resolvedParams.id);
          break;
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      return NextResponse.json(result);
    } catch (dbError: any) {
      console.error('Database error in period API:', dbError);
      
      // Handle case where database schema hasn't been updated yet
      if (dbError.message?.includes('Unknown table') || 
          dbError.message?.includes('doesn\'t exist') ||
          dbError.message?.includes('MealPeriod') ||
          dbError.code === 'P2023') {
        return NextResponse.json(
          { error: 'Period management is not available yet. Please update the database schema first.' },
          { status: 503 }
        );
      }
      
      // Handle unique constraint violations
      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { error: 'A period with this name already exists or there is already an active period.' },
          { status: 400 }
        );
      }
      
      // Re-throw other database errors
      throw dbError;
    }
  } catch (error: any) {
    console.error('Error updating period:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update period' },
      { status: 500 }
    );
  }
} 