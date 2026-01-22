import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { validateGroupAccess, canPerformAction, Permission } from "@/lib/auth/group-auth";
import { GroupInvitesService } from "@/lib/services/group-invites-service";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const generateTokenSchema = z.object({
  role: z.enum(["MEMBER", "ADMIN", "MODERATOR"]).default("MEMBER"),
});

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { role } = generateTokenSchema.parse(body);

    // Verify group access (must be at least a member)
    const access = await validateGroupAccess(groupId);
    if (!access.success || !access.authResult) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { authResult } = access;
    
    // Permission Logic:
    // 1. If generating a MEMBER invite, any active member can do it (unless banned, which is checked in validateGroupAccess)
    // 2. If generating an invite for ADMIN/MODERATOR/etc, user must have MANAGE_MEMBERS permission

    if (role !== "MEMBER") {
      // Check for elevated permissions
      const canManageMembers = await canPerformAction(groupId, 'manage_members');
      if (!canManageMembers) {
         return NextResponse.json({ error: 'Insufficient permissions to create privileged invites' }, { status: 403 });
      }
    }

    const inviteToken = await GroupInvitesService.generateLinkToken(groupId, session.user.id, role as any);

    // Construct the full URL
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL;
    const inviteUrl = `${origin}/join/${inviteToken.token}`;

    return NextResponse.json({
      token: inviteToken.token,
      url: inviteUrl,
      expiresAt: inviteToken.expiresAt
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
       return NextResponse.json({ error: 'Invalid input', details: error.format() }, { status: 400 });
    }
    console.error('Error generating invite token:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite link' },
      { status: 500 }
    );
  }
}
