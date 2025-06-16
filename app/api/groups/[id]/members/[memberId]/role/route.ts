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

    // Check if user is admin or owner
    const currentMember = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: currentUserId,
        role: {
          in: [Role.ADMIN, Role.OWNER]
        }
      }
    });

    if (!currentMember) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Unauthorized'
      }), { status: 401 });
    }

    // Find the target member
    const targetMember = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: memberId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!targetMember) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Member not found'
      }), { status: 404 });
    }

    // Prevent changing owner's role
    if (targetMember.role === Role.OWNER) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Cannot change owner\'s role'
      }), { status: 400 });
    }

    // Update member role
    const updatedMember = await prisma.roomMember.update({
      where: {
        id: targetMember.id
      },
      data: {
        role: newRole as Role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    }) as MemberWithUser;

    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Member role updated successfully',
      member: updatedMember,
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
