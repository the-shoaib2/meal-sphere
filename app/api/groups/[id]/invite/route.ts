import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Role } from '@prisma/client';
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

// Schema for creating an invitation
const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'GUEST', 'ADMIN', 'MODERATOR', 'MANAGER', 'LEADER', 'MEAL_MANAGER', 'ACCOUNTANT', 'MARKET_MANAGER']),
  expiresAt: z.number().optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/groups/[id]/invite - Create an invitation link
export async function POST(
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
    const body = await request.json();
    const validation = createInvitationSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { email, role, expiresAt } = validation.data;

    // Verify group exists
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: { id: true }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // Verify user is an admin of the group
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

    // Check if invitation already exists for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        groupId,
        email,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return new NextResponse('An invitation already exists for this email', { status: 400 });
    }

    // Generate a secure random invitation code
    let code = '';
    let codeExists = true;
    const maxAttempts = 5;
    let attempts = 0;

    while (codeExists && attempts < maxAttempts) {
      code = randomBytes(16).toString('hex');
      const existingCode = await prisma.invitation.findUnique({ 
        where: { code },
        select: { id: true }
      });
      codeExists = !!existingCode;
      attempts++;
    }

    if (codeExists) {
      throw new Error('Failed to generate a unique invitation code after multiple attempts');
    }

    // Create the invitation
    const invitation = await prisma.invitation.create({
      data: {
        code,
        groupId,
        email,
        role,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: userId,
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
    });

    // Construct the invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const joinUrl = new URL(`/groups/join/${encodeURIComponent(groupId)}`, baseUrl);
    joinUrl.searchParams.append('code', invitation.code);
    joinUrl.searchParams.append('email', encodeURIComponent(email));
    
    return NextResponse.json({
      invitationUrl: joinUrl.toString(),
      invitation,
    } as CreateInvitationResponse);
  } catch (error) {
    console.error('Error creating invitation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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
    
    // Verify group exists
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: { id: true }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // Verify admin access
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
    console.error('Error fetching invitations:', error);
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
    
    // Verify group exists
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: { id: true }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    // Verify admin access
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

    // Delete the invitation
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
    console.error('Error deleting invitation:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
