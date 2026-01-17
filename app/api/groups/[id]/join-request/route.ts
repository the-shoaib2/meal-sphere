import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { Role } from '@prisma/client';
import { validateGroupAccess, validateAdminAccess } from '@/lib/auth/group-auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await request.json();

    // Check if group exists and user can access it
    const validation = await validateGroupAccess(id);
    if (!validation.success || !validation.authResult) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { authResult } = validation;

    // Check if user is already a member
    if (authResult.isMember) {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        roomId: id,
        userId: session.user.id,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending join request' }, { status: 400 });
    }

    // Create or update join request using upsert
    const joinRequest = await prisma.joinRequest.upsert({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: id
        }
      },
      update: {
        status: 'PENDING',
        message,
        updatedAt: new Date()
      },
      create: {
        roomId: id,
        userId: session.user.id,
        message,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      message: 'Join request sent successfully',
      joinRequest
    });
  } catch (error) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'Failed to create join request' },
      { status: 500 }
    );
  }
}

// GET /api/groups/[id]/join-request - Get all join requests for a group (admin/manager only)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: groupId } = await params;

    // OPTIMIZED: Single query to check membership AND fetch join requests
    const [membership, joinRequests] = await Promise.all([
      prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: groupId
          }
        },
        select: {
          role: true,
          isBanned: true
        }
      }),
      prisma.joinRequest.findMany({
        where: {
          roomId: groupId
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Check if user is admin
    if (!membership || membership.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (membership.isBanned) {
      return NextResponse.json({ error: 'You are banned from this group' }, { status: 403 });
    }

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}