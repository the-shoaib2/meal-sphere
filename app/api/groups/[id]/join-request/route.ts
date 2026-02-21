import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { Role } from '@prisma/client';
import { validateGroupAccess, validateAdminAccess } from '@/lib/auth/group-auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await request.json();

    // Check if group exists and user isn't banned
    const group = await prisma.room.findUnique({
        where: { id },
        include: {
            members: {
                where: { userId: session.user.id }
            }
        }
    });

    if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const membership = group.members[0];
    if (membership?.isBanned) {
        return NextResponse.json({ error: 'You are banned from this group' }, { status: 403 });
    }

    // Check if user is already a member
    if (membership && !membership.isBanned) {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        roomId: id,
        userId: session.user.id,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending join request' }, { status: 400 });
    }

    // Create or update join request using upsert
    const joinRequest = await prisma.joinRequest.upsert({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: id
        }
      },
      update: {
        status: 'PENDING',
        message,
        updatedAt: new Date()
      },
      create: {
        roomId: id,
        userId: session.user.id,
        message,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      message: 'Join request sent successfully',
      joinRequest
    });
  } catch (error) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'Failed to create join request' },
      { status: 500 }
    );
  }
}

// GET /api/groups/[id]/join-request - Get all join requests for a group (admin/manager only)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: groupId } = await params;

    // OPTIMIZED: Single query to check membership AND fetch join requests
    const [membership, joinRequests] = await Promise.all([
      prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: groupId
          }
        },
        select: {
          role: true,
          isBanned: true
        }
      }),
      prisma.joinRequest.findMany({
        where: {
          roomId: groupId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Check if user is admin
    if (!membership || membership.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (membership.isBanned) {
      return NextResponse.json({ error: 'You are banned from this group' }, { status: 403 });
    }

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/join-request - Cancel a join request
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Find the request
    const existingRequest = await prisma.joinRequest.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId
        }
      }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    // Don't allow deleting approved requests via this endpoint (they should leave the group instead)
    if (existingRequest.status === 'APPROVED') {
       return NextResponse.json({ error: 'Cannot cancel an approved request. Please leave the group instead.' }, { status: 400 });
    }

    // Delete the request
    await prisma.joinRequest.delete({
      where: {
        id: existingRequest.id
      }
    });

    return NextResponse.json({ message: 'Join request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling join request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel join request' },
      { status: 500 }
    );
  }
}