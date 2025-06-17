import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await context.params;

    // Find the invite token
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        room: {
          include: {
            members: {
              where: {
                userId: session.user.id
              }
            }
          }
        }
      }
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite token has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const isMember = inviteToken.room.members.length > 0;

    return NextResponse.json({
      group: {
        id: inviteToken.room.id,
        name: inviteToken.room.name,
        description: inviteToken.room.description,
        isPrivate: inviteToken.room.isPrivate,
        createdAt: inviteToken.room.createdAt,
        updatedAt: inviteToken.room.updatedAt,
        createdById: inviteToken.room.createdBy,
        isMember
      },
      role: inviteToken.role,
      groupId: inviteToken.roomId,
      isMember
    });
  } catch (error) {
    console.error('Error in join token route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await context.params;

    // Find the invite token
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        room: {
          include: {
            members: {
              where: {
                userId: session.user.id
              }
            }
          }
        }
      }
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    // Check if the token is expired
    if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite token has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    if (inviteToken.room.members.length > 0) {
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // Add user to the group
    await prisma.roomMember.create({
      data: {
        roomId: inviteToken.roomId,
        userId: session.user.id,
        role: inviteToken.role
      }
    });

    // Delete the used invite token
    await prisma.inviteToken.delete({
      where: { id: inviteToken.id }
    });

    return NextResponse.json({
      success: true,
      groupId: inviteToken.roomId
    });
  } catch (error) {
    console.error('Error in join token route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 