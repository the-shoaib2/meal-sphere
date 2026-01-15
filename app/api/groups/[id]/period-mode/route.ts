import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// Enable caching for better performance
export const revalidate = 30; // Cache for 30 seconds

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

        // Quick validation - just check if room exists and get periodMode
        const room = await prisma.room.findUnique({
            where: { id: groupId },
            select: { periodMode: true },
        });

        if (!room) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Return with cache headers for better performance
        return NextResponse.json(
            { periodMode: room.periodMode || 'CUSTOM' },
            {
                headers: {
                    'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
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

        // Check if user is admin/moderator
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: groupId,
                userId: session.user.id,
            },
        });

        if (!member || !['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(member.role)) {
            return NextResponse.json(
                { error: 'Insufficient permissions. Only admins can change period mode.' },
                { status: 403 }
            );
        }

        // Update the room's period mode
        const updatedRoom = await prisma.room.update({
            where: { id: groupId },
            data: { periodMode: mode },
        });

        // If switching to MONTHLY mode, create current month period if it doesn't exist
        if (mode === 'MONTHLY') {
            const now = new Date();
            const monthName = format(now, 'MMMM yyyy'); // e.g., "January 2024"
            const startDate = startOfMonth(now);

            // Check if a period with this name already exists
            const existingPeriod = await prisma.mealPeriod.findFirst({
                where: {
                    roomId: groupId,
                    name: monthName,
                },
            });

            // Check if there's an active period
            const activePeriod = await prisma.mealPeriod.findFirst({
                where: {
                    roomId: groupId,
                    status: 'ACTIVE',
                },
            });

            // Only create if no period exists for this month and no active period
            if (!existingPeriod && !activePeriod) {
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
