import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to continue' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { token } = await context.params;

    // Find the invite token with inviter information
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
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if the token is expired
    if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite token has expired' },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is already a member
    const isMember = inviteToken.room.members.length > 0;

    // Get current member count
    const currentMemberCount = await prisma.roomMember.count({
      where: { roomId: inviteToken.roomId }
    });

    // Return the response with proper headers
    return NextResponse.json({
      success: true,
      data: {
        group: {
          id: inviteToken.room.id,
          name: inviteToken.room.name,
          description: inviteToken.room.description || '',
          isPrivate: inviteToken.room.isPrivate,
          createdAt: inviteToken.room.createdAt,
          updatedAt: inviteToken.room.updatedAt,
          createdById: inviteToken.room.createdBy,
          isMember,
          memberCount: currentMemberCount,
          maxMembers: inviteToken.room.maxMembers,
          fineEnabled: inviteToken.room.fineEnabled || false,
          fineAmount: inviteToken.room.fineAmount || 0,
          category: inviteToken.room.category,
          tags: inviteToken.room.tags || []
        },
        role: inviteToken.role,
        groupId: inviteToken.roomId,
        isMember,
        inviter: {
          id: inviteToken.createdByUser.id,
          name: inviteToken.createdByUser.name,
          email: inviteToken.createdByUser.email,
          image: inviteToken.createdByUser.image
        },
        expiresAt: inviteToken.expiresAt
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in join token route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Please sign in to continue' 
        },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
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
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!inviteToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired invite token' 
        },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if the token is expired
    if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invite token has expired' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is already a member
    if (inviteToken.room.members.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'You are already a member of this group' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if group is full
    const currentMemberCount = await prisma.roomMember.count({
      where: { roomId: inviteToken.roomId }
    });

    if (inviteToken.room.maxMembers && currentMemberCount >= inviteToken.room.maxMembers) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Group is full. Cannot join at this time.' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // For private groups, require join request instead of direct joining
    if (inviteToken.room.isPrivate) {
      // Check if user already has a pending request
      const existingRequest = await prisma.joinRequest.findFirst({
        where: {
          roomId: inviteToken.roomId,
          userId: session.user.id,
          status: 'PENDING'
        }
      });

      if (existingRequest) {
        return NextResponse.json(
          { 
            success: false,
            error: 'You already have a pending join request for this group' 
          },
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Create or update join request for private group using upsert
      const joinRequest = await prisma.joinRequest.upsert({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: inviteToken.roomId
          }
        },
        update: {
          status: 'PENDING',
          message: `Invited via token by ${inviteToken.createdByUser?.name || 'an admin'}`,
          updatedAt: new Date()
        },
        create: {
          roomId: inviteToken.roomId,
          userId: session.user.id,
          message: `Invited via token by ${inviteToken.createdByUser?.name || 'an admin'}`,
          status: 'PENDING'
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          groupId: inviteToken.roomId,
          message: 'Join request sent successfully. Waiting for admin approval.',
          joinRequest: true,
          isPrivate: true
        }
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For public groups, allow direct joining
    await prisma.roomMember.create({
      data: {
        roomId: inviteToken.roomId,
        userId: session.user.id,
        role: inviteToken.role
      }
    });

    // Update member count in the room
    await prisma.room.update({
      where: { id: inviteToken.roomId },
      data: {
        memberCount: currentMemberCount + 1
      }
    });

    // Note: We don't delete the invite token anymore to allow multiple joins
    // The token will only be invalidated when it expires

    return NextResponse.json({
      success: true,
      data: {
        groupId: inviteToken.roomId,
        message: 'Successfully joined the group'
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in join token route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 