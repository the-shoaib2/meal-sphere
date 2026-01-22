import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { removeMemberFromGroup, updateMemberRole } from '@/lib/services/groups-service';
import { Role } from "@prisma/client";

// Helper to log detailed debug info
function logDebugInfo(label: string, data: any) {
  console.log(`[DEBUG] ${label}:`, JSON.stringify(data, null, 2));
}

type RouteParams = {
  params: Promise<{ id: string; memberId: string }>;
};

// DELETE /api/groups/[id]/members/[memberId] - Remove a member from the group
export async function DELETE(
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
        message: 'Unauthorized',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Call service to remove member
    await removeMemberFromGroup(groupId, session.user.id, memberId);

    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Member removed successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error removing member:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;

    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Failed to remove member',
        error: msg,
      }),
      { status: status }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: groupId, memberId } = await params;
    const { role } = await request.json();

    const updatedMember = await updateMemberRole(groupId, session.user.id, memberId, role as Role);

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("[MEMBER_UPDATE]", error);
    return new NextResponse(
        error instanceof Error ? error.message : "Internal Server Error", 
        { status: 500 }
    );
  }
}
