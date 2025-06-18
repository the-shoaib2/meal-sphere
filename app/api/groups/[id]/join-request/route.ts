import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from '@prisma/client';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await request.json();

    // Check if group exists
    const group = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is already a member
    if (group.members.length > 0) {
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

    // Create join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

    // Check if user is admin or manager
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
        { error: 'Unauthorized - Only admins and managers can view join requests' },
        { status: 401 }
      );
    }

    // Get all join requests for the group
    const joinRequests = await prisma.joinRequest.findMany({
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
    });

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
} 