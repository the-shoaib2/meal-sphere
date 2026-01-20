import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService, fetchPeriodsData } from '@/lib/services/period-service';
import { prisma } from '@/lib/services/prisma';

// Force dynamic rendering
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

        // OPTIMIZATION: Use the centralized cached data fetching function
        // This utilizes unstable_cache and ensures consistency with server components
        const periodsData = await fetchPeriodsData(session.user.id, groupId, includeArchived);

        if (!periodsData) {
             return NextResponse.json({ error: 'Failed to load periods data' }, { status: 500 });
        }

        if (!periodsData.userRole) {
             return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
        }

        return NextResponse.json({
            periods: periodsData.periods,
            currentPeriod: periodsData.activePeriod, 
            periodMode: periodsData.roomData?.periodMode || 'MONTHLY',
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error('Error fetching unified periods data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch periods data' },
            { status: 500 }
        );
    }
}
