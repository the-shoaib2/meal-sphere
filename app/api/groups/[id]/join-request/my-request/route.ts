import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/groups/[id]/join-request/my-request - Get user's own join request status
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

    // Get join request status for the current user
    const joinRequest = await prisma.joinRequest.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      joinRequest
    });
  } catch (error) {
    console.error('Error fetching join request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join request' },
      { status: 500 }
    );
  }
} 