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
    const includeArchived = searchParams.get('includeArchived') === 'true';

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
      // Lazy check: Ensure monthly period logic is enforced when listing periods
      try {
        await PeriodService.ensureMonthPeriod(groupId, session.user.id);
      } catch (e) {
        console.warn('Failed to ensure monthly period:', e);
        // Continue anyway to show existing periods
      }

      const periods = await PeriodService.getPeriods(groupId, includeArchived);
      return NextResponse.json({ periods });
    } catch (dbError: any) {
      // Handle case where database schema hasn't been updated yet
      if (dbError.message?.includes('Unknown table') ||
        dbError.message?.includes('doesn\'t exist') ||
        dbError.message?.includes('MealPeriod')) {
        return NextResponse.json({ periods: [] });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch periods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, name, startDate, endDate, openingBalance, carryForward, notes } = body;

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

    // Validate required fields
    if (!name || !startDate) {
      return NextResponse.json(
        { error: 'Name and start date are required' },
        { status: 400 }
      );
    }

    try {
      const result = await PeriodService.startPeriod(groupId, session.user.id, {
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        openingBalance: openingBalance || 0,
        carryForward: carryForward || false,
        notes,
      });

      return NextResponse.json(result);
    } catch (dbError: any) {
      // Handle case where database schema hasn't been updated yet
      if (dbError.message?.includes('Unknown table') ||
        dbError.message?.includes('doesn\'t exist') ||
        dbError.message?.includes('MealPeriod')) {
        return NextResponse.json(
          { error: 'Period management is not available yet. Please update the database schema first.' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Error creating period:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create period' },
      { status: 400 }
    );
  }
} 
