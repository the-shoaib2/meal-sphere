import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format, startOfMonth, endOfMonth } from 'date-fns';

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


        // Get group information
        const room = await prisma.room.findUnique({
            where: { id: groupId },
            select: { periodMode: true }
        });

        if (!room) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Get member info within this group
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: groupId,
                userId: session.user.id,
            },
        });

        // Check permissions
        let canChange = false;
        if (member) {
            if (['ADMIN', 'MANAGER', 'MODERATOR'].includes(member.role)) {
                canChange = true;
            }
        }

        if (!canChange) {
            return NextResponse.json(
                { error: 'Insufficient permissions. Only admins or authorized staff can change period mode.' },
                { status: 403 }
            );
        }

        // Check if there's an active period
        const activePeriod = await prisma.mealPeriod.findFirst({
            where: {
                roomId: groupId,
                status: 'ACTIVE',
            },
        });

        // 1. If currently in MONTHLY mode and has an active period, cannot change mode
        if (room.periodMode === 'MONTHLY' && activePeriod) {
            return NextResponse.json(
                { error: 'Cannot change period mode while a monthly period is active. Please end the current period first.' },
                { status: 400 }
            );
        }

        // Update the room's period mode
        const updatedRoom = await prisma.room.update({
            where: { id: groupId },
            data: { periodMode: mode },
        });

        // 2. If switching to MONTHLY mode, create current month period if no active period exists
        if (mode === 'MONTHLY' && !activePeriod) {
            const now = new Date();
            const monthName = format(now, 'MMMM yyyy');
            const startDate = startOfMonth(now);

            // Check if a period with this name already exists (any status)
            const existingMonthPeriod = await prisma.mealPeriod.findFirst({
                where: {
                    roomId: groupId,
                    name: monthName,
                },
            });

            if (!existingMonthPeriod) {
                await prisma.mealPeriod.create({
                    data: {
                        name: monthName,
                        startDate,
                        endDate: null,
                        status: 'ACTIVE',
                        roomId: groupId,
                        createdBy: session.user.id,
                        openingBalance: 0,
                        carryForward: false,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            periodMode: updatedRoom.periodMode,
            message: `Period mode updated to ${mode}`,
        });
    } catch (error) {
        console.error('Error updating period mode:', error);
        return NextResponse.json(
            { error: 'Failed to update period mode' },
            { status: 500 }
        );
    }
}
