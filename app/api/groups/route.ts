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
        bannerUrl: bannerUrl || '', 
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

    // Invalidate caches using revalidateTag for Next.js unstable_cache
    revalidateTag(`user-${session.user.id}`, { force: true } as any);
    revalidateTag('groups', { force: true } as any);
    
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

    const startTime = Date.now();
    const groups = await cacheGetOrSet(
      cacheKey,
      async () => {
        // If user is not authenticated OR filter is 'public', return public groups
        if (!session?.user?.id || filter === 'public') {
          return await getPublicGroups(50, session?.user?.id);
        }

        // For 'all' filter - Optimized Split Query
        // OR queries across relations are slow in Prisma/SQL. We split into two parallel fast queries.
        if (filter === 'all') {
          const [publicGroups, myGroups] = await Promise.all([
             // 1. Fetch all public groups
             prisma.room.findMany({
                where: { isPrivate: false, isActive: true },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isPrivate: true,
                  createdAt: true,
                  memberCount: true,
                  createdByUser: {
                    select: { id: true, name: true, image: true }
                  },
                  // We still need to check if *I* am a member of these public groups to show "Joined" status
                  members: {
                    where: { userId: session.user.id },
                    select: { role: true, joinedAt: true, isCurrent: true }
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
             }),
             // 2. Fetch my groups (private or public)
             prisma.room.findMany({
                where: { 
                    isActive: true,
                    members: { some: { userId: session.user.id } }
                },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isPrivate: true,
                  createdAt: true,
                  memberCount: true,
                  createdByUser: {
                    select: { id: true, name: true, image: true }
                  },
                  members: {
                    where: { userId: session.user.id },
                    select: { role: true, joinedAt: true, isCurrent: true }
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
             })
          ]);

          // Merge and Deduplicate (by ID)
          const allGroupsMap = new Map();
          
          // Add my groups first (priority)
          myGroups.forEach(g => allGroupsMap.set(g.id, g));
          
          // Add public groups if not present
          publicGroups.forEach(g => {
              if (!allGroupsMap.has(g.id)) {
                  allGroupsMap.set(g.id, g);
              }
          });
          
          const combinedGroups = Array.from(allGroupsMap.values())
             .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Maintain sort

          // Standardize response format
          return combinedGroups.map((group: any) => {
            const membership = group.members?.[0];
            const role = (membership?.role as Role) || null;
            return {
              ...group,
              members: [], // Don't leak other members
              userRole: role,
              permissions: role ? (ROLE_PERMISSIONS[role] || []) : [],
              joinedAt: membership?.joinedAt || null,
              isCurrent: membership?.isCurrent || false,
              isCurrentMember: !!membership
            };
          });
        }

        // Default: for authenticated users, return groups where they are members
        return await getUserGroups(session.user.id, false);
      },
      { ttl: CACHE_TTL.GROUPS_LIST }
    );

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
