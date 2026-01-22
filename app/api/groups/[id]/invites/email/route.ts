import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { validateAdminAccess } from "@/lib/auth/group-auth";
import { GroupInvitesService } from "@/lib/services/group-invites-service";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const sendInvitesSchema = z.object({
  emails: z.array(z.string().email()),
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
    const { emails, role } = sendInvitesSchema.parse(body);

    // Verify admin access
    const validation = await validateAdminAccess(groupId);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';

    const sender = {
        name: session.user.name || 'A user',
        email: session.user.email || '',
        image: session.user.image || null
    };

    const results = await GroupInvitesService.sendEmailInvites(
        groupId,
        session.user.id,
        emails,
        role as any,
        sender,
        origin
    );

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      message: `Successfully sent ${successCount} invitations`,
      results
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
       return NextResponse.json({ error: 'Invalid input', details: error.format() }, { status: 400 });
    }
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}
