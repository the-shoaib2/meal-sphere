import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { revalidatePath } from 'next/cache';

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

        // Use transaction for atomic updates
        await prisma.$transaction([
            // Set all user's groups to isCurrent = false
            prisma.roomMember.updateMany({
                where: {
                    userId: session.user.id,
                },
                data: {
                    isCurrent: false,
                },
            }),
            // Set the selected group as current
            prisma.roomMember.update({
                where: {
                    userId_roomId: {
                        userId: session.user.id,
                        roomId: groupId,
                    },
                },
                data: {
                    isCurrent: true,
                },
            }),
        ]);

        // Revalidate paths that depend on group data
        revalidatePath('/(auth)', 'layout');
        revalidatePath('/dashboard');
        revalidatePath('/groups');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error setting current group:', error);
        return NextResponse.json(
            { error: 'Failed to set current group' },
            { status: 500 }
        );
    }
}
