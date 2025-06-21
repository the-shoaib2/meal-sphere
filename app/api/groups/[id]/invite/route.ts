import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface InviteTokenResponse {
  id: string;
  token: string;
  roomId: string;
  createdBy: string;
  role: Role;
  expiresAt: Date | null;
  createdAt: Date;
  createdByUser?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface CreateInviteTokenResponse {
  success: boolean;
  data: {
    token: string;
    inviteUrl: string;
    expiresAt: Date | null;
    role: Role;
  };
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/groups/[id]/invite - Create an invite token
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: groupId } = await params;
    const { role = "MEMBER", expiresInDays = 7 } = await request.json();

    // Validate the group exists and user has permission
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: session.user.id,
            role: {
              in: [Role.ADMIN, Role.MANAGER, Role.MODERATOR, Role.OWNER]
            }
          }
        }
      }
    });

    if (!group) {
      return new NextResponse("Group not found", { status: 404 });
    }

    if (group.members.length === 0) {
      return new NextResponse("Unauthorized - You need admin permissions to create invites", { status: 401 });
    }

    // Check if group is full
    const currentMemberCount = await prisma.roomMember.count({
      where: { roomId: groupId }
    });

    if (group.maxMembers && currentMemberCount >= group.maxMembers) {
      return new NextResponse("Group is full. Cannot create more invites.", { status: 400 });
    }

    // Generate a unique token - mixed characters (letters, numbers, special chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$&';
    let token = '';
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Calculate expiration date - handle both hours and days
    let expiresAt: Date | null = null;
    if (expiresInDays !== null && expiresInDays !== 0) {
      // Convert to milliseconds (expiresInDays can be fractional for hours)
      const expiryMs = expiresInDays * 24 * 60 * 60 * 1000;
      expiresAt = new Date(Date.now() + expiryMs);
    }

    // Create invite token
    const inviteToken = await prisma.inviteToken.create({
      data: {
        token,
        roomId: groupId,
        createdBy: session.user.id,
        role: role as Role,
        expiresAt
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create activity log
    await prisma.groupActivityLog.create({
      data: {
        type: "INVITE_TOKEN_CREATED",
        details: {
          token: token,
          role: role,
          expiresAt: expiresAt
        },
        roomId: groupId,
        userId: session.user.id
      }
    });

    // Generate invite URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/groups/join/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token: inviteToken.token,
        inviteUrl,
        expiresAt: inviteToken.expiresAt,
        role: inviteToken.role
      }
    });
  } catch (error) {
    console.error("[GROUP_INVITE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET /api/groups/[id]/invite - Get group's invite tokens
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;
    const { id: groupId } = resolvedParams;
    
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: { id: true }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId,
        role: { in: ['ADMIN', 'MODERATOR', 'MANAGER', 'OWNER'] },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden - You need admin permissions to view invites', { status: 403 });
    }

    const inviteTokens = await prisma.inviteToken.findMany({
      where: {
        roomId: groupId,
        expiresAt: {
          gt: new Date() // Only show non-expired tokens
        }
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: inviteTokens
    });
  } catch (error) {
    console.error("[GET_INVITE_TOKENS]", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

type DeleteRouteParams = {
  params: Promise<{ id: string; token: string }>;
};

// DELETE /api/groups/[id]/invite - Delete an invite token
export async function DELETE(
  request: NextRequest,
  { params }: DeleteRouteParams
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;
    const { id: groupId, token } = resolvedParams;
    
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: { id: true }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId,
        role: { in: ['ADMIN', 'MODERATOR', 'MANAGER', 'OWNER'] },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden - You need admin permissions to delete invites', { status: 403 });
    }

    // Delete the invite token
    await prisma.inviteToken.delete({
      where: {
        token: token
      },
    });

    // Create activity log
    await prisma.groupActivityLog.create({
      data: {
        type: "INVITE_TOKEN_DELETED",
        details: {
          token: token
        },
        roomId: groupId,
        userId: session.user.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE_INVITE_TOKEN]", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

