import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { joinGroup } from '@/lib/services/groups-service';

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

    // Find the invite token to get the groupId
    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        room: true
      }
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    try {
      // Use the unified joinGroup service which handles notifications, counts, and validation
      const result = await joinGroup(invite.roomId, session.user.id, undefined, token);

      if (result.requestCreated) {
        return NextResponse.json({
          success: true,
          data: {
            groupId: invite.roomId,
            message: 'Join request sent successfully. Waiting for admin approval.',
            joinRequest: true,
            isPrivate: true
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          groupId: invite.roomId,
          message: 'Successfully joined the group'
        }
      });
    } catch (error: any) {
      // Map service errors to appropriate HTTP responses
      const errorMessage = error.message || 'Failed to join group';
      
      if (errorMessage.includes('has expired')) {
         return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
      }
      if (errorMessage.includes('Already a member')) {
         return NextResponse.json({ success: false, error: 'You are already a member of this group' }, { status: 400 });
      }
      if (errorMessage.includes('full')) {
         return NextResponse.json({ success: false, error: 'Group is full. Cannot join at this time.' }, { status: 400 });
      }

      throw error; // Let the outer catch handle it
    }
  } catch (error) {
    console.error('Error in join token route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}