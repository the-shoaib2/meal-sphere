import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';


interface InvitationResponse {
  id: string;
  code: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  usedBy?: string;
  groupId: string;
  createdBy: string;
  creator?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface CreateInvitationResponse {
  invitationUrl: string;
  invitation: InvitationResponse;
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/groups/[id]/invite - Create an invitation link
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
    const { email = session.user.email, role = "MEMBER" } = await request.json();

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    // Validate the group exists and user has permission
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: session.user.id,
            role: {
              in: ["OWNER", "ADMIN", "MODERATOR"]
            }
          }
        }
      }
    });

    if (!group) {
      return new NextResponse("Group not found", { status: 404 });
    }

    if (group.members.length === 0) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user already has an invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        groupId,
        email,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      return new NextResponse("Invitation already exists", { status: 400 });
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        code: nanoid(10),
        email: email,
        role: role as Role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        groupId,
        createdBy: session.user.id
      }
    });

    // Create activity log
    await prisma.groupActivityLog.create({
      data: {
        type: "INVITATION_CREATED",
        details: {
          email,
          role,
          invitationId: invitation.id
        },
        roomId: groupId,
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      invitation: {
        code: invitation.code,
        email: invitation.email,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error("[GROUP_INVITE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET /api/groups/[id]/invite - Get group's invitations
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
        role: { in: ['ADMIN', 'MODERATOR'] },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        groupId,
      },
      include: {
        creator: {
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

    return NextResponse.json(invitations);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

type DeleteRouteParams = {
  params: Promise<{ id: string; code: string }>;
};

// DELETE /api/groups/[id]/invite - Delete an invitation
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
    const { id: groupId, code } = resolvedParams;
    
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
        role: { in: ['ADMIN', 'MODERATOR'] },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await prisma.invitation.delete({
      where: {
        code_groupId: {
          code,
          groupId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Remove the first POST and GET implementations (invitation model)
// Keep only the inviteToken-based POST and GET at the end of the file
// Ensure only one POST and one GET are exported
// Remove any code referencing the invitation model

