import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { Role } from '@prisma/client';
import { processJoinRequest } from "@/lib/services/groups-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId, requestId } = await params;
    const { action } = await request.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Check if user is admin or manager (only these roles can approve/reject)
    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id,
        role: {
          in: [Role.ADMIN, Role.MANAGER]
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins and managers can approve/reject join requests' },
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

    // Delegate processing to service
    const result = await processJoinRequest(requestId, action);

    // If successful, return the updated request (fetching it again or just returning success)
    // The service returns { success: true }. 
    // We can fetch the updated request if needed, but the client might just need success.
    // The previous implementation returned full updated request.
    const finalRequest = await prisma.joinRequest.findUnique({ where: { id: requestId } });
    
    return NextResponse.json({
      message: `Join request ${action}d successfully`,
      joinRequest: finalRequest
    });


  } catch (error) {
    console.error('Error handling join request:', error);
    return NextResponse.json(
      { error: 'Failed to handle join request' },
      { status: 500 }
    );
  }
} 