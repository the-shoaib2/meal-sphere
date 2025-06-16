import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Room, Prisma } from '@prisma/client';

type RoomCreateInput = Prisma.RoomCreateInput;

// Schema for creating a new group
const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().positive().max(100).optional(),
});

// GET /api/groups - Get all public groups or user's groups
// POST /api/groups - Create a new group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = createGroupSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), { status: 400 });
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
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to create group', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500 }
    );
  }
}

// GET /api/groups - Get all public groups or user's groups
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const isMember = searchParams.get('isMember') === 'true';

    // If user is not authenticated, only return public groups
    if (!session?.user?.email) {
      const publicGroups = await prisma.room.findMany({
        where: { isPrivate: false },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return NextResponse.json(publicGroups);
    }

    // If user is authenticated, get their groups or all groups based on query params
    let groups;
    if (isMember && userId) {
      // Get groups where the user is a member
      const memberGroups = await prisma.roomMember.findMany({
        where: { userId },
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
            },
          },
        },
      });

      // Remove duplicates by user ID
      groups = memberGroups.map(member => ({
        ...member.room,
        // Filter out duplicate users by creating a Map with user.id as key
        members: Array.from(
          new Map(
            member.room.members.map(member => [member.user.id, {
              ...member,
              // Only include the first occurrence of each user
              user: member.user
            }])
          ).values()
        ),
      }));
    } else {
      // Get all public groups and groups where user is a member
      const [publicGroups, userGroups] = await Promise.all([
        prisma.room.findMany({
          where: { isPrivate: false },
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        }),
        prisma.roomMember.findMany({
          where: { userId: session.user.id },
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
              },
            },
          },
        }),
      ]);

      // Combine and deduplicate groups
      const allGroups = [...publicGroups, ...userGroups.map(ug => ug.room)];
      const uniqueGroupIds = new Set();
      
      groups = allGroups.filter(group => {
        if (uniqueGroupIds.has(group.id)) return false;
        uniqueGroupIds.add(group.id);
        return true;
      });
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
