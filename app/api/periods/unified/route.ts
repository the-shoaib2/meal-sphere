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

        // Verify user has access to this group
        const member = await prisma.roomMember.findUnique({
            where: {
                userId_roomId: {
                    userId: session.user.id,
                    roomId: groupId,
                },
            },
            include: {
                room: {
                    select: {
                        periodMode: true,
                        features: true, // If we need to check features
                    }
                }
            }
        });

        if (!member) {
            return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
        }

        try {
            // Execute all queries in parallel
            const [periods, currentPeriod] = await Promise.all([
                PeriodService.getPeriods(groupId, includeArchived),
                PeriodService.getCurrentPeriod(groupId),
            ]);

            return NextResponse.json({
                periods,
                currentPeriod,
                periodMode: member.room.periodMode || 'CUSTOM',
            }, {
                headers: {
                    'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30'
                }
            });

        } catch (dbError: any) {
            // Handle case where database schema hasn't been updated yet
            if (dbError.message?.includes('Unknown table') ||
                dbError.message?.includes('doesn\'t exist') ||
                dbError.message?.includes('MealPeriod')) {
                return NextResponse.json({
                    periods: [],
                    currentPeriod: null,
                    periodMode: member.room.periodMode || 'CUSTOM'
                });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('Error fetching unified periods data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch periods data' },
            { status: 500 }
        );
    }
}
