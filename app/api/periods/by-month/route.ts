import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService } from '@/lib/services/period-service';
import { prisma } from '@/lib/services/prisma';


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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
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
      const periods = await PeriodService.getPeriodsByMonth(groupId, year, month);
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
    console.error('Error fetching periods by month:', error);
    return NextResponse.json(
      { error: 'Failed to fetch periods by month' },
      { status: 500 }
    );
  }
} 
