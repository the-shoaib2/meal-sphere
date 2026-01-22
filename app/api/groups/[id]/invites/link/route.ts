import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { validateAdminAccess } from "@/lib/auth/group-auth";
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

    // Verify admin access
    const validation = await validateAdminAccess(groupId);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
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
