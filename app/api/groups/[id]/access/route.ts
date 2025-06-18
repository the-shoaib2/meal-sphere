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

    // Regular group access check
    const group = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
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

    return NextResponse.json({
      isMember,
      userRole,
      canAccess: isMember,
      groupId: group.id
    });
  } catch (error) {
    console.error('Error checking group access:', error);
    return NextResponse.json(
      { error: 'Failed to check group access' },
      { status: 500 }
    );
  }
} 