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

    // Check if group exists and get its privacy settings
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

    // Check if group is full
    if (group.maxMembers) {
      const currentMemberCount = await prisma.roomMember.count({
        where: { roomId: id }
      });

      if (currentMemberCount >= group.maxMembers) {
        return NextResponse.json({ error: 'Group is full. Cannot join at this time.' }, { status: 400 });
      }
    }

    // For private groups, create join request
    if (group.isPrivate) {
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

      // Create activity log
      await prisma.groupActivityLog.create({
        data: {
          type: "JOIN_REQUEST_CREATED",
          details: {
            userId: session.user.id,
            message: message
          },
          roomId: id,
          userId: session.user.id
        }
      });

      return NextResponse.json({
        message: 'Join request sent successfully',
        joinRequest
      });
    } else {
      // For public groups, directly add user as member
      await prisma.roomMember.create({
        data: {
          roomId: id,
          userId: session.user.id,
          role: Role.MEMBER
        }
      });

      // Update group member count
      await prisma.room.update({
        where: { id },
        data: {
          memberCount: {
            increment: 1
          }
        }
      });

      // Create activity log
      await prisma.groupActivityLog.create({
        data: {
          type: "MEMBER_JOINED",
          details: {
            userId: session.user.id
          },
          roomId: id,
          userId: session.user.id
        }
      });

      return NextResponse.json({
        message: 'Successfully joined the group',
        joined: true
      });
    }
  } catch (error) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'Failed to create join request' },
      { status: 500 }
    );
  }
}

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

    const { id } = await params;

    // Get join request status for the current user
    const joinRequest = await prisma.joinRequest.findFirst({
      where: {
        roomId: id,
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      joinRequest
    });
  } catch (error) {
    console.error('Error fetching join request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join request' },
      { status: 500 }
    );
  }
} 