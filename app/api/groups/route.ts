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
  password: z.string().optional(),
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

    const { name, description, isPrivate, password, maxMembers } = validation.data;

    // If group is private, password is required
    if (isPrivate && !password) {
      return new NextResponse('Password is required for private groups', { status: 400 });
    }

    // Hash the password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create the group with required fields
    const group = await prisma.room.create({
      data: {
        name,
        description: description || '',
        isPrivate: isPrivate || false,
        password: hashedPassword || null,
        maxMembers: maxMembers || 20, // Default to 20 if not provided
        fineAmount: 0,
        fineEnabled: false,
        isActive: true,
        createdBy: session.user.id,
        memberCount: 1,
        bannerUrl: '', // Provide default empty string for required field
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
    
    // Remove password from the response
    const { password: _, ...groupWithoutPassword } = group;
    return NextResponse.json(groupWithoutPassword);
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
