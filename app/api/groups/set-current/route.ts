import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { revalidatePath } from 'next/cache';
import { setCurrentGroup } from '@/lib/services/groups-service';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { groupId } = await request.json();

        if (!groupId || typeof groupId !== 'string') {
            return NextResponse.json(
                { error: 'Group ID is required' },
                { status: 400 }
            );
        }

        // Verify user is a member of the group
        const membership = await prisma.roomMember.findUnique({
            where: {
                userId_roomId: {
                    userId: session.user.id,
                    roomId: groupId,
                },
            },
        });

        if (!membership) {
            return NextResponse.json(
                { error: 'You are not a member of this group' },
                { status: 403 }
            );
        }

        // Efficiently switch groups:
        // 1. Unset any currently active group (should be at most one)
        // 2. Set the new group as active
        // This avoids O(N) writes where N is user's total groups

        // Efficiently switch groups using service
        await setCurrentGroup(groupId, session.user.id);

        // Revalidate paths that depend on group data
        revalidatePath('/(auth)', 'layout');
        revalidatePath('/dashboard');
        revalidatePath('/groups');
        revalidatePath('/periods');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error setting current group:', error);
        return NextResponse.json(
            { error: 'Failed to set current group' },
            { status: 500 }
        );
    }
}
