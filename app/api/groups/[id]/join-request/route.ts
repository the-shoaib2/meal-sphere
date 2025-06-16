import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();
    const groupId = params.id;

    // Check if group exists
    const group = await prisma.room.findUnique({
      where: { id: groupId },
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
    const existingRequest = await prisma.groupJoinRequest.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending join request' }, { status: 400 });
    }

    // Create join request
    const joinRequest = await prisma.groupJoinRequest.create({
      data: {
        userId: session.user.id,
        roomId: groupId,
        message: message || undefined,
        status: 'PENDING'
      }
    });

    // Notify group admins
    const admins = await prisma.roomMember.findMany({
      where: {
        roomId: groupId,
        role: {
          in: [Role.ADMIN, Role.MODERATOR, Role.MEAL_MANAGER]
        }
      },
      include: {
        user: true
      }
    });

    // Create notifications for admins
    await Promise.all(
      admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.userId,
            type: 'MEMBER_ADDED',
            message: `New join request from ${session.user.name || 'A user'} for group ${group.name}`
          }
        })
      )
    );

    return NextResponse.json({ 
      message: 'Join request sent successfully',
      request: joinRequest
    });
  } catch (error: any) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create join request' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const groupId = context.params.id;

    // Check if user is admin
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId
        }
      },
      select: { role: true }
    });

    if (!membership || membership.role !== Role.ADMIN) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all pending requests
    const requests = await prisma.groupJoinRequest.findMany({
      where: {
        roomId: groupId,
        status: 'PENDING'
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

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[JOIN_REQUESTS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 