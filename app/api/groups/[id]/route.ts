import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { z } from 'zod';
import { validateGroupAccess, validateAdminAccess, getGroupData } from '@/lib/auth/group-auth';
import { cacheGetOrSet, cacheDelete } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { getGroupWithMembers } from '@/lib/group-query-helpers';
import { updateGroup, deleteGroup, fetchGroupDetails } from '@/lib/services/groups-service';

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

    const groupData = await fetchGroupDetails(id, session.user.id);
    
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateGroupSchema.parse(body);

    // Validate admin access
    const validation = await validateAdminAccess(id);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const updatedGroup = await updateGroup(id, validatedData);

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await deleteGroup(id, session.user.id);

    return NextResponse.json({ message: 'Group deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting group:', error);
    if (error instanceof Error && error.message.includes('Only the group creator')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
