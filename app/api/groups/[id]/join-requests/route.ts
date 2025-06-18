import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from '@prisma/client';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

    // Check if user is admin or manager
    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id,
        role: {
          in: [Role.ADMIN, Role.MANAGER]
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins and managers can view join requests' },
        { status: 401 }
      );
    }

    // Get all join requests for the group
    const joinRequests = await prisma.joinRequest.findMany({
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
    });

    return NextResponse.json({
      success: true,
      data: joinRequests
    });
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
} 