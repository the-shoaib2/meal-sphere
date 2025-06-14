import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Schema for updating a group
const updateGroupSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
  password: z.string().optional().nullable(),
  maxMembers: z.number().int().positive().max(100).optional(),
  bannerUrl: z.string().url().optional().nullable(),
});

// Schema for joining a group
const joinGroupSchema = z.object({
  password: z.string().optional(),
});

// GET /api/groups/[id] - Get group details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params object before destructuring in Next.js 15.2.4
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Get password from URL search params if provided
    const { searchParams } = new URL(req.url);
    const password = searchParams.get('password');

    // Get the group
    const group = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // If user is a member, return full group data
    const isMember = group.members.some(member => member.userId === userId);
    if (isMember) {
      return NextResponse.json({
        ...group,
        members: group.members.map(member => ({
          ...member,
          password: undefined, // Don't expose password hashes
        })),
      });
    }

    // For non-members, check if the group is private
    if (group.isPrivate) {
      // If no password provided, return 403 with group info
      if (!password) {
        // Return basic group info needed for the UI
        const { members, password: _, ...groupData } = group;
        return new NextResponse(JSON.stringify({
          requiresPassword: true,
          message: 'This is a private group. A password is required.',
          group: {
            ...groupData,
            hasPassword: !!group.password,
            memberCount: members?.length || 0
          }
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      // Verify password if provided
      const isPasswordValid = await bcrypt.compare(password, group.password || '');
      if (!isPasswordValid) {
        return new NextResponse(JSON.stringify({
          requiresPassword: true,
          message: 'Invalid password. Please try again.'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // If we get here, either:
    // 1. The group is public, or
    // 2. It's private but the password was verified
    return NextResponse.json({
      ...group,
      password: undefined,
      members: group.members.length, // Only return count, not member details
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PATCH /api/groups/[id] - Update group
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify user is an admin of the group
    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'MODERATOR'] },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const validation = updateGroupSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), { status: 400 });
    }

    const { password, ...updateData } = validation.data;
    const updatePayload: any = { ...updateData };

    // Handle password update
    if (password !== undefined) {
      updatePayload.password = password ? await bcrypt.hash(password, 10) : null;
      updatePayload.isPrivate = password !== null;
    }

    // Update the group
    const updatedGroup = await prisma.room.update({
      where: { id },
      data: updatePayload,
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/groups/[id] - Delete group
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Unauthorized' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { id } = await params;
  
  try {
    // Verify user is the creator of the group and get group details
    const group = await prisma.room.findUnique({
      where: { id },
      select: { 
        createdBy: true,
        name: true 
      },
    });

    if (!group) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Group not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (group.createdBy !== session.user.id) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Forbidden' }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the group (cascade delete will handle related records)
    await prisma.room.delete({
      where: { id },
    });

    return new NextResponse(JSON.stringify({ 
      success: true,
      message: 'Group deleted successfully' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to delete group',
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST /api/groups/[id]/join - Join a group
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = joinGroupSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), { status: 400 });
    }

    const { password } = validation.data;

    // Get the group
    const group = await prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        isPrivate: true,
        password: true,
        maxMembers: true,
        memberCount: true,
        members: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // Check if user is already a member
    if (group.members.length > 0) {
      return new NextResponse('Already a member of this group', { status: 400 });
    }

    // Check if group is full
    if (group.maxMembers && group.memberCount >= group.maxMembers) {
      return new NextResponse('Group is full', { status: 400 });
    }

    // Verify password if group is private
    if (group.isPrivate || group.password) {
      if (!password) {
        return new NextResponse('Password is required', { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(password, group.password || '');
      if (!isPasswordValid) {
        return new NextResponse('Invalid password', { status: 401 });
      }
    }

    // Add user to group
    await prisma.$transaction([
      prisma.roomMember.create({
        data: {
          userId: session.user.id,
          roomId: group.id,
          role: 'MEMBER',
        },
      }),
      prisma.room.update({
        where: { id: group.id },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error joining group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
