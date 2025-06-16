import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    const { id: groupId, requestId } = params;

    // Check if the user is an admin of the group
    const adminMember = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id,
        role: {
          in: [Role.ADMIN, Role.MODERATOR, Role.MEAL_MANAGER]
        }
      }
    });

    if (!adminMember) {
      return NextResponse.json({ error: 'You do not have permission to manage join requests' }, { status: 403 });
    }

    // Get the join request
    const joinRequest = await prisma.groupJoinRequest.findUnique({
      where: {
        id: requestId,
        roomId: groupId
      },
      include: {
        user: true,
        room: true
      }
    });

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Start a transaction to handle the approval
      const result = await prisma.$transaction(async (tx) => {
        // Update the join request status
        const updatedRequest = await tx.groupJoinRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' }
        });

        // Add the user as a member
        const member = await tx.roomMember.create({
          data: {
            userId: joinRequest.userId,
            roomId: groupId,
            role: Role.MEMBER
          }
        });

        // Update member count
        await tx.room.update({
          where: { id: groupId },
          data: {
            memberCount: {
              increment: 1
            }
          }
        });

        // Create notification for the user
        await tx.notification.create({
          data: {
            userId: joinRequest.userId,
            type: 'MEMBER_ADDED',
            message: `Your request to join ${joinRequest.room.name} has been approved`
          }
        });

        return { request: updatedRequest, member };
      });

      return NextResponse.json({
        message: 'Join request approved successfully',
        ...result
      });
    } else if (action === 'reject') {
      // Update the join request status
      const updatedRequest = await prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      });

      // Create notification for the user
      await prisma.notification.create({
        data: {
          userId: joinRequest.userId,
          type: 'MEMBER_REMOVED',
          message: `Your request to join ${joinRequest.room.name} has been rejected`
        }
      });

      return NextResponse.json({
        message: 'Join request rejected successfully',
        request: updatedRequest
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing join request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process join request' },
      { status: 500 }
    );
  }
} 