import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

// Helper to log detailed debug info
function logDebugInfo(label: string, data: any) {
  console.log(`[DEBUG] ${label}:`, JSON.stringify(data, null, 2));
}

// DELETE /api/groups/[id]/members/[memberId] - Remove a member from the group
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Unauthorized',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { id: groupId, memberId } = params;
    const currentUserId = session.user.id;

    logDebugInfo('Request params', { groupId, memberId, currentUserId });

    // Get the current user's membership
    const currentUserMembership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: currentUserId,
      },
    });
    
    logDebugInfo('Current user membership', currentUserMembership);

    // If user is not a member of the group
    if (!currentUserMembership) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'You are not a member of this group',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Get the target member using the roomMember ID (memberId)
    const targetMember = await prisma.roomMember.findUnique({
      where: {
        id: memberId,
        roomId: groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logDebugInfo('Target member', targetMember);

    if (!targetMember) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Member not found in this group',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Check if current user is trying to remove themselves
    const isRemovingSelf = targetMember.userId === currentUserId;

    // If not removing self, check admin privileges
    if (!isRemovingSelf && currentUserMembership.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Only group admins can remove other members',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Prevent removing other admins (only the admin themselves can leave)
    if (!isRemovingSelf && targetMember.role === 'ADMIN') {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Cannot remove another admin. Please demote them first.',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Remove the member
    await prisma.roomMember.delete({
      where: {
        id: targetMember.id,
      },
    });

    // Update the member count in the room
    await prisma.room.update({
      where: { id: groupId },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });

    return new NextResponse(JSON.stringify({
      success: true,
      message: isRemovingSelf ? 'You have left the group' : 'Member removed successfully',
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error removing member:', error);
    
    // Log detailed error information
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Failed to remove member',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}
