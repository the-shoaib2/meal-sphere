import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

// Schema for updating a group
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
  maxMembers: z.number().min(1).optional(),
  bannerUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  features: z.record(z.boolean()).optional()
});

// Schema for joining a group
const joinGroupSchema = z.object({
  password: z.string().optional(),
});

// GET /api/groups/[id] - Get group details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const group = await prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isPrivate: true,
        maxMembers: true,
        createdBy: true,
        createdAt: true,
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            userId: true,
            roomId: true,
            isBanned: true,
            lastActive: true,
            mutedUntil: true,
            permissions: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true
              }
            }
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        }
      }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PATCH /api/groups/[id] - Update group
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateGroupSchema.parse(body);

    // Check if user is a member and has admin rights
    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: id,
        userId: session.user.id,
        role: 'ADMIN'
      }
    });

    if (!membership) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const updatedGroup = await prisma.room.update({
      where: { id },
      data: validatedData
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid request data', { status: 400 });
    }
    console.error('Error updating group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/groups/[id] - Delete group
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is the creator
    const group = await prisma.room.findUnique({
      where: { id },
      select: {
        createdBy: true
      }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    if (group.createdBy !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await prisma.room.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/groups/[id]/join - Join a group
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const group = await prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPrivate: true,
        maxMembers: true,
        members: {
          where: {
            userId: session.user.id
          }
        }
      }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // Check if user is already a member
    if (group.members.length > 0) {
      return new NextResponse('Already a member of this group', { status: 400 });
    }

    // For private groups, require join request instead of direct joining
    if (group.isPrivate) {
      return new NextResponse('This is a private group. Please send a join request instead of trying to join directly.', { status: 403 });
    }

    // Check if group is full
    const memberCount = await prisma.roomMember.count({
      where: { roomId: group.id }
    });

    if (group.maxMembers && memberCount >= group.maxMembers) {
      return new NextResponse('Group is full', { status: 400 });
    }

    // Create membership (only for public groups)
    const result = await prisma.roomMember.create({
      data: {
        userId: session.user.id,
        roomId: group.id,
        role: 'MEMBER'
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error joining group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
