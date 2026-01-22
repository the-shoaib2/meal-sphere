import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { z } from 'zod';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { getUserGroups, getPublicGroups } from '@/lib/group-query-helpers';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { Role } from '@prisma/client';
import { createGroup, fetchGroupsList } from '@/lib/services/groups-service';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// Schema for creating a new group
const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().positive().max(100).optional(),
  bannerUrl: z.string().optional(),
});

// POST /api/groups - Create a new group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.format() }, { status: 400 });
    }

    const { name, description, isPrivate, maxMembers, bannerUrl } = validation.data;

    const group = await createGroup({
        name,
        description,
        isPrivate,
        maxMembers,
        bannerUrl,
        userId: session.user.id
    });
    
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error in group creation:', error);
    return NextResponse.json({
      error: 'Failed to create group',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/groups - Get groups based on user authentication and permissions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'my';

    const startTime = Date.now();
    
    const groups = await fetchGroupsList(session?.user?.id, filter);

    const duration = Date.now() - startTime;
    return NextResponse.json(groups, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'Server-Timing': `total;dur=${duration}`
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
