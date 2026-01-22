import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { updateMemberRole } from '@/lib/services/groups-service';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(Object.values(Role) as [string, ...string[]]),
});

type RouteParams = {
  params: Promise<{ id: string; memberId: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const { id: groupId, memberId } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({
        success: false,
        message: 'Unauthorized'
      }), { status: 401 });
    }

    const body = await request.json();
    const { role: newRole } = updateRoleSchema.parse(body);

    const updatedMember = await updateMemberRole(groupId, session.user.id, memberId, newRole as Role);

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
