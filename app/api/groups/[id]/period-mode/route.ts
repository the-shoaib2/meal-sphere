import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/services/prisma';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { updatePeriodMode } from '@/lib/services/groups-service';

// Enable aggressive caching for better performance
export const revalidate = 0; // Cache for 0 seconds

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;

        // OPTIMIZED: Only select the periodMode field - minimal data transfer
        const room = await prisma.room.findUnique({
            where: { id: groupId },
            select: {
                periodMode: true
            },
        });

        if (!room) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Return with aggressive cache headers for maximum performance
        return NextResponse.json(
            { periodMode: room.periodMode || 'MONTHLY' },
            {
                headers: {
                    // Cache for 60 seconds, allow stale content for 2 minutes while revalidating
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store'
                },
            }
        );
    } catch (error) {
        console.error('Error fetching period mode:', error);
        return NextResponse.json(
            { error: 'Failed to fetch period mode' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;
        const body = await req.json();
        const { mode } = body;

        if (!mode || !['MONTHLY', 'CUSTOM'].includes(mode)) {
            return NextResponse.json(
                { error: 'Invalid mode. Must be MONTHLY or CUSTOM' },
                { status: 400 }
            );
        }

        const updatedRoom = await updatePeriodMode(groupId, mode, session.user.id);

        return NextResponse.json({
            success: true,
            periodMode: updatedRoom.periodMode,
            message: `Period mode updated to ${mode}`,
        });
    } catch (error) {
        console.error('Error updating period mode:', error);
        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('Insufficient permissions')) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
            if (error.message.includes('Cannot change period mode')) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            if (error.message.includes('Group not found')) {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
        }
        return NextResponse.json(
            { error: 'Failed to update period mode' },
            { status: 500 }
        );
    }
}
