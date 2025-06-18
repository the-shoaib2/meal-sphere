import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { isValidObjectId } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    // Get group with members and join requests
    const group = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
        },
        joinRequests: {
          where: {
            userId: session.user.id
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const isMember = group.members.length > 0;
    const userRole = isMember ? group.members[0].role : null;
    const joinRequest = group.joinRequests[0] || null;

    // Determine access level
    let canAccess = false;
    let accessReason = '';

    if (isMember) {
      canAccess = true;
      accessReason = 'You are a member of this group';
    } else if (group.isPrivate) {
      // For private groups, check join request status
      if (joinRequest) {
        if (joinRequest.status === 'APPROVED') {
          canAccess = true;
          accessReason = 'Your join request has been approved';
        } else if (joinRequest.status === 'PENDING') {
          canAccess = false;
          accessReason = 'Your join request is pending approval';
        } else if (joinRequest.status === 'REJECTED') {
          canAccess = false;
          accessReason = 'Your join request has been rejected';
        }
      } else {
        canAccess = false;
        accessReason = 'This is a private group. You need to request to join.';
      }
    } else {
      // Public group - anyone can join
      canAccess = true;
      accessReason = 'This is a public group. You can join directly.';
    }

    return NextResponse.json({
      isMember,
      userRole,
      canAccess,
      accessReason,
      groupId: group.id,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        isPrivate: group.isPrivate,
        memberCount: group.memberCount,
        maxMembers: group.maxMembers,
        createdAt: group.createdAt,
        category: group.category,
        tags: group.tags,
        fineEnabled: group.fineEnabled,
        fineAmount: group.fineAmount
      },
      joinRequest: joinRequest ? {
        status: joinRequest.status.toLowerCase(),
        message: joinRequest.message,
        createdAt: joinRequest.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error checking group access:', error);
    return NextResponse.json(
      { error: 'Failed to check group access' },
      { status: 500 }
    );
  }
} 