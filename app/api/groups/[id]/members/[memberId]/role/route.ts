import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { Role, type RoomMember } from '@prisma/client';
import { z } from 'zod';

// Type for the response data
type MemberWithUser = RoomMember & {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

// Schema for updating member role - includes all possible role values from Prisma schema
const updateRoleSchema = z.object({
  role: z.enum(Object.values(Role) as [string, ...string[]]),
});

type RouteParams = {
  params: Promise<{ id: string; memberId: string }>;
};

// Helper to log debug info
function logDebugInfo(label: string, data: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${label}:`, JSON.stringify(data, null, 2));
  }
}

// Helper to validate UUIDs
function isValidId(id: string): boolean {
  return /^[0-9a-f]{24}$/.test(id);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const { id: groupId, memberId } = resolvedParams;
    
    // Log the parsed values
    logDebugInfo('Parsed params', { groupId, memberId });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        message: 'Unauthorized' 
      }), { status: 401 });
    }

    // Validate IDs
    if (!isValidId(groupId) || !isValidId(memberId)) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Invalid group or member ID',
      }), { status: 400 });
    }

    const currentUserId = session.user.id;

    // Validate request body
    const body = await request.json();
    const { role: newRole } = updateRoleSchema.parse(body);

    // Get the current user's membership
    const currentUserMembership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: currentUserId,
      },
    });

    // Only group admins can update member roles
    if (currentUserMembership?.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Forbidden: Only group admins can update member roles',
      }), { status: 403 });
    }

    // Prevent changing your own role (admins should have another admin demote them)
    if (memberId === currentUserId) {
      return new NextResponse('Cannot change your own role. Ask another admin to do it for you.', { 
        status: 400 
      });
    }

    // Get the target member using the roomMember's ID (memberId)
    const targetMember = await prisma.roomMember.findUnique({
      where: {
        id: memberId,
        roomId: groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logDebugInfo('Target member query', {
      where: { id: memberId, roomId: groupId },
    });
    logDebugInfo('Target member result', targetMember);

    if (!targetMember) {
      return new NextResponse('Member not found in this group', { status: 404 });
    }

    // Prevent changing the role of another admin
    if (targetMember.role === 'ADMIN' && currentUserId !== targetMember.userId) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Cannot change the role of another admin',
      }), { status: 400 });
    }

    // Update the member's role
    const updatedMember = await prisma.roomMember.update({
      where: {
        id: targetMember.id,
      },
      data: {
        role: newRole as Role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }) as MemberWithUser;

    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Member role updated successfully',
      member: {
        id: updatedMember.id,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt.toISOString(),
        userId: updatedMember.userId,
        roomId: updatedMember.roomId,
        user: {
          id: updatedMember.user.id,
          name: updatedMember.user.name,
          email: updatedMember.user.email,
          image: updatedMember.user.image,
        },
      },
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    
    // Log detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      ...(error instanceof z.ZodError ? { issues: error.issues } : {})
    };
    
    logDebugInfo('Error details', errorDetails);
    
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Invalid request data',
          errors: error.errors,
        }),
        { status: 400 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Failed to update member role',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}
