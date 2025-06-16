import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // First try to find an InviteToken
    const inviteToken = await prisma.inviteToken.findUnique({
      where: {
        token: token
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            memberCount: true,
            createdBy: true,
            createdAt: true,
            createdByUser: {
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

    if (inviteToken) {
      // Check if token is expired
      if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This invite token has expired' },
          { status: 400 }
        );
      }

      // Check if token has been used
      if (inviteToken.usedAt) {
        return NextResponse.json(
          { error: 'This invite token has already been used' },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.roomMember.findFirst({
        where: {
          roomId: inviteToken.roomId,
          userId: session.user.id
        }
      });

      if (existingMember) {
        return NextResponse.json(
          { 
            error: 'You are already a member of this group',
            groupId: inviteToken.roomId
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        group: inviteToken.room,
        role: inviteToken.role
      });
    }

    // If no InviteToken found, try to find an Invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: token
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            memberCount: true,
            createdBy: true,
            createdAt: true,
            createdByUser: {
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

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invite token' },
        { status: 400 }
      );
    }

    // Check if invitation has been used
    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findFirst({
      where: {
        roomId: invitation.groupId,
        userId: session.user.id
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { 
          error: 'You are already a member of this group',
          groupId: invitation.groupId
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      group: invitation.group,
      role: invitation.role
    });
  } catch (error) {
    console.error('Error validating invite token:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite token' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // First try to find an InviteToken
    const inviteToken = await prisma.inviteToken.findUnique({
      where: {
        token: token
      }
    });

    if (inviteToken) {
      // Check if token is expired
      if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This invite token has expired' },
          { status: 400 }
        );
      }

      // Check if token has been used
      if (inviteToken.usedAt) {
        return NextResponse.json(
          { error: 'This invite token has already been used' },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.roomMember.findFirst({
        where: {
          roomId: inviteToken.roomId,
          userId: session.user.id
        }
      });

      if (existingMember) {
        return NextResponse.json(
          { 
            error: 'You are already a member of this group',
            groupId: inviteToken.roomId
          },
          { status: 200 }
        );
      }

      // Create the membership
      await prisma.roomMember.create({
        data: {
          roomId: inviteToken.roomId,
          userId: session.user.id,
          role: inviteToken.role
        }
      });

      // Mark the token as used
      await prisma.inviteToken.update({
        where: {
          id: inviteToken.id
        },
        data: {
          usedAt: new Date()
        }
      });

      // Update member count
      await prisma.room.update({
        where: {
          id: inviteToken.roomId
        },
        data: {
          memberCount: {
            increment: 1
          }
        }
      });

      return NextResponse.json({ success: true });
    }

    // If no InviteToken found, try to find an Invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: token
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invite token' },
        { status: 400 }
      );
    }

    // Check if invitation has been used
    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findFirst({
      where: {
        roomId: invitation.groupId,
        userId: session.user.id
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { 
          error: 'You are already a member of this group',
          groupId: invitation.groupId
        },
        { status: 200 }
      );
    }

    // Create the membership
    await prisma.roomMember.create({
      data: {
        roomId: invitation.groupId,
        userId: session.user.id,
        role: invitation.role
      }
    });

    // Mark the invitation as used
    await prisma.invitation.update({
      where: {
        id: invitation.id
      },
      data: {
        usedAt: new Date(),
        usedBy: session.user.id
      }
    });

    // Update member count
    await prisma.room.update({
      where: {
        id: invitation.groupId
      },
      data: {
        memberCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  }
} 