import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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
    const userId = searchParams.get('userId');
    const isMember = searchParams.get('isMember') === 'true';
    const includePrivate = searchParams.get('includePrivate') === 'true';

    // If user is not authenticated, only return public groups
    if (!session?.user?.id) {
      const publicGroups = await prisma.room.findMany({
        where: { 
          isPrivate: false,
          isActive: true 
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(publicGroups);
    }

    // For authenticated users, only return groups where they are members
    const memberGroups = await prisma.roomMember.findMany({
      where: { 
        userId: session.user.id,
        room: { isActive: true }
      },
      include: {
        room: {
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
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
            _count: {
              select: {
                members: true
              }
            }
          },
        },
      },
      orderBy: {
        room: { createdAt: 'desc' }
      }
    });

    // Transform the data to match the expected format
    const groups = memberGroups.map(member => ({
      ...member.room,
      userRole: member.role,
      joinedAt: member.joinedAt,
      isCurrentMember: true
    }));

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
