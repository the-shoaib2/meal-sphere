import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cacheGetOrSet } from '@/lib/cache-service';
import { CACHE_TTL } from '@/lib/cache-keys';
import { getUserGroups, getPublicGroups } from '@/lib/group-query-helpers';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// Schema for creating a new group
const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().positive().max(100).optional(),
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

    const { name, description, isPrivate, maxMembers } = validation.data;

    // Create the group with required fields
    const group = await prisma.room.create({
      data: {
        name,
        description: description || '',
        isPrivate: isPrivate || false,
        maxMembers: maxMembers || 20, // Default to 20 if not provided
        fineAmount: 0,
        fineEnabled: false,
        isActive: true,
        createdBy: session.user.id,
        periodMode: 'MONTHLY',
        memberCount: 1,
        bannerUrl: '', // Provide default empty string for required field
        features: {
          join_requests: isPrivate, // Enable join requests for private groups
          messages: true,
          announcements: true,
          member_roles: false,
          activity_log: true,
          shopping: true,
          meals: true,
          payments: true
        },
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
            isCurrent: true
          }
        }
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        members: {
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
        }
      }
    });

    if (!group) {
      throw new Error('Failed to create group: No group was returned from database');
    }

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

    // Generate cache key based on user and filter
    const cacheKey = `groups_list:${session?.user?.id || 'anonymous'}:${filter}`;

    const groups = await cacheGetOrSet(
      cacheKey,
      async () => {
        // If user is not authenticated OR filter is 'public', return public groups
        if (!session?.user?.id || filter === 'public') {
          return await getPublicGroups(50, session?.user?.id);
        }

        // For 'all' filter - return both user's groups and public groups
        if (filter === 'all') {
          const [userGroups, publicGroups] = await Promise.all([
            getUserGroups(session.user.id, false),
            getPublicGroups(50, session.user.id)
          ]);

          // Merge and deduplicate
          const groupMap = new Map();
          [...userGroups, ...publicGroups].forEach(g => {
            if (!groupMap.has(g.id)) {
              groupMap.set(g.id, g);
            }
          });

          return Array.from(groupMap.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        // Default: for authenticated users, return groups where they are members
        return await getUserGroups(session.user.id, false);
      },
      { ttl: CACHE_TTL.GROUPS_LIST }
    );

    return NextResponse.json(groups, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
