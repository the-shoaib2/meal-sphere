import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateGroupAccess, validateAdminAccess, getGroupData } from '@/lib/auth/group-auth';
import { cacheGetOrSet, cacheDelete } from '@/lib/cache-service';
import { CACHE_TTL } from '@/lib/cache-keys';
import { getGroupWithMembers } from '@/lib/group-query-helpers';

// Schema for updating a group
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
  maxMembers: z.number().min(1).optional(),
  bannerUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  features: z.record(z.string(), z.boolean()).optional()
});

// Schema for joining a group
const joinGroupSchema = z.object({
  password: z.string().optional(),
});

// GET /api/groups/[id] - Get group details with proper access control
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use cached helper for group data
    const cacheKey = `group_details:${id}:${session.user.id}`;
    
    const groupData = await cacheGetOrSet(
      cacheKey,
      async () => {
        // Use optimized data fetcher that handles access control internally
        const data = await getGroupData(id, session.user.id);
        if (!data) {
          throw new Error('Group not found or access denied');
        }
        return data;
      },
      { ttl: CACHE_TTL.GROUP_DETAILS }
    );

    return NextResponse.json(groupData, {
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=180',
      }
    });

  } catch (error) {
    console.error('Error fetching group:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/groups/[id] - Update group (admin only)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateGroupSchema.parse(body);

    // Validate admin access
    const validation = await validateAdminAccess(id);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const updatedGroup = await prisma.room.update({
      where: { id },
      data: validatedData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // Invalidate caches
    await Promise.all([
      cacheDelete(`group_details:${id}:*`),
      cacheDelete(`groups_list:*`),
      cacheDelete(`group_with_members:${id}:*`)
    ]);

    return NextResponse.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.format() }, { status: 400 });
    }
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/groups/[id] - Delete group (creator only)
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate group access
    const validation = await validateGroupAccess(id);
    if (!validation.success || !validation.authResult) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { authResult } = validation;

    // Only creator can delete the group
    if (!authResult.isCreator) {
      return NextResponse.json({ error: 'Only the group creator can delete this group' }, { status: 403 });
    }

    // Delete the group (cascade will handle related data)
    await prisma.room.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Group deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/groups/[id]/join - Join a group (public groups only)
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const validatedData = joinGroupSchema.parse(body);

    // Check if group exists and get basic info
    const group = await prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPrivate: true,
        maxMembers: true,
        members: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is already a member
    if (group.members.length > 0) {
      return NextResponse.json({ error: 'Already a member of this group' }, { status: 400 });
    }

    // For private groups, require join request instead of direct joining
    if (group.isPrivate) {
      return NextResponse.json({
        error: 'This is a private group. Please send a join request instead of trying to join directly.'
      }, { status: 403 });
    }

    // Check if group is full
    const memberCount = await prisma.roomMember.count({
      where: { roomId: group.id }
    });

    if (group.maxMembers && memberCount >= group.maxMembers) {
      return NextResponse.json({ error: 'Group is full' }, { status: 400 });
    }

    // Create membership (only for public groups)
    const result = await prisma.roomMember.create({
      data: {
        userId: session.user.id,
        roomId: group.id,
        role: 'MEMBER'
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
      }
    });

    // Update member count
    await prisma.room.update({
      where: { id },
      data: { memberCount: memberCount + 1 }
    });

    return NextResponse.json({
      message: 'Successfully joined the group',
      membership: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.format() }, { status: 400 });
    }
    console.error('Error joining group:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
