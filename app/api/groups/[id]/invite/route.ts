import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';


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
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId } = await context.params;
    const { role = Role.MEMBER } = await request.json();

    const member = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id,
        OR: [
          { role: Role.OWNER },
          { role: Role.ADMIN }
        ]
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      const invitation = await prisma.invitation.create({
        data: {
          code: token,
          groupId,
          createdBy: session.user.id,
          role,
          expiresAt,
          email: '' // Optional field, can be empty for open invites
        }
      });

      const admins = await prisma.roomMember.findMany({
        where: {
          roomId: groupId,
          OR: [
            { role: Role.OWNER },
            { role: Role.ADMIN }
          ]
        },
        select: {
          userId: true
        }
      });

      await Promise.all(
        admins.map(admin =>
          prisma.notification.create({
            data: {
              type: 'GENERAL',
              message: `New invite token generated for group`,
              userId: admin.userId
            }
          })
        )
      );

      return NextResponse.json({
        token: invitation.code,
        groupId,
        expiresAt: invitation.expiresAt
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate invite' },
      { status: 500 }
    );
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

