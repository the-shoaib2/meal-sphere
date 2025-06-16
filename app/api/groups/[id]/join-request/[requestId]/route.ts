import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role, NotificationType } from '@prisma/client';

type RouteContext = {
  params: {
    id: string;
    requestId: string;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId, requestId } = params;
    const { action } = await request.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Check if user is admin or moderator
    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id,
        role: {
          in: [Role.ADMIN, Role.MODERATOR]
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the join request
    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        room: true
      }
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      );
    }

    if (joinRequest.roomId !== groupId) {
      return NextResponse.json(
        { error: 'Invalid group' },
        { status: 400 }
      );
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Join request is not pending' },
        { status: 400 }
      );
    }

    // Update join request status
    const updatedRequest = await prisma.joinRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED'
      }
    });

    // If approved, add user to group
    if (action === 'approve') {
      await prisma.roomMember.create({
        data: {
          roomId: groupId,
          userId: joinRequest.userId,
          role: Role.MEMBER
        }
      });

      // Create notification for approved request
      await prisma.notification.create({
        data: {
          userId: joinRequest.userId,
          type: NotificationType.JOIN_REQUEST_APPROVED,
          message: `Your join request for ${joinRequest.room.name} has been approved!`
        }
      });
    } else {
      // Create notification for rejected request
      await prisma.notification.create({
        data: {
          userId: joinRequest.userId,
          type: NotificationType.JOIN_REQUEST_REJECTED,
          message: `Your join request for ${joinRequest.room.name} has been rejected.`
        }
      });
    }

    return NextResponse.json({
      message: `Join request ${action}d successfully`,
      joinRequest: updatedRequest
    });
  } catch (error) {
    console.error('Error handling join request:', error);
    return NextResponse.json(
      { error: 'Failed to handle join request' },
      { status: 500 }
    );
  }
} 