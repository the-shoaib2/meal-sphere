import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService } from '@/lib/period-service';
import { prisma } from '@/lib/prisma';

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

        // OPTIMIZATION: Fetch member and periods in parallel
        const [member, periods] = await Promise.all([
            // Verify user has access to this group
            prisma.roomMember.findUnique({
                where: {
                    userId_roomId: {
                        userId: session.user.id,
                        roomId: groupId,
                    },
                },
                select: {
                    room: {
                        select: {
                            periodMode: true,
                        }
                    }
                }
            }),

            // Fetch all periods in one query
            prisma.mealPeriod.findMany({
                where: {
                    roomId: groupId,
                    ...(includeArchived ? {} : {
                        status: {
                            in: ['ACTIVE', 'ENDED', 'LOCKED'],
                        }
                    })
                },
                orderBy: {
                    startDate: 'desc',
                },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    isLocked: true,
                    openingBalance: true,
                    closingBalance: true,
                    roomId: true,
                }
            })
        ]);

        if (!member) {
            return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
        }

        // Extract current period from the results (already fetched)
        const currentPeriod = periods.find((p: any) => p.status === 'ACTIVE') || null;

        return NextResponse.json({
            periods,
            currentPeriod,
            periodMode: member.room.periodMode || 'MONTHLY',
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
