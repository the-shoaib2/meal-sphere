import { NextRequest, NextResponse } from 'next/server';
import { checkGroupAccess } from '@/lib/auth/group-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Use the new group authentication system
    const authResult = await checkGroupAccess(id);

    // Get group details if access is granted
    let groupData = null;
    if (authResult.canAccess) {
      const group = await prisma.room.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          isPrivate: true,
          memberCount: true,
          bannerUrl: true,
          category: true
        }
      });
      groupData = group;
    }

    return NextResponse.json({
      isMember: authResult.isMember,
      userRole: authResult.userRole,
      canAccess: authResult.canAccess,
      isAdmin: authResult.isAdmin,
      isCreator: authResult.isCreator,
      groupId: authResult.groupId,
      group: groupData,
      error: authResult.error
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check group access' },
      { status: 500 }
    );
  }
} 