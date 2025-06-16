import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { sendGroupInviteEmail } from "@/lib/email-utils";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await Promise.resolve(context.params);
    const { emails, role = "MEMBER" } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "At least one email is required" },
        { status: 400 }
      );
    }

    if (emails.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 email addresses allowed" },
        { status: 400 }
      );
    }

    // Get group details
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Create invitations and send emails
    const invitations = await Promise.all(
      emails.map(async (email) => {
        const invitation = await prisma.invitation.create({
          data: {
            code: Math.random().toString(36).substring(2, 15),
            email: email,
            role: role,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            groupId,
            createdBy: session.user.id
          }
        });

        // Generate invite URL
        const inviteUrl = `${process.env.NEXTAUTH_URL}/groups/join?code=${invitation.code}&groupId=${groupId}`;

        // Send invitation email
        await sendGroupInviteEmail(
          email,
          email.split('@')[0], // Use part of email as name if not available
          group.name,
          inviteUrl,
          role
        );

        return invitation;
      })
    );

    return NextResponse.json({
      success: true,
      invitations: invitations.map(inv => ({
        code: inv.code,
        email: inv.email,
        expiresAt: inv.expiresAt,
        groupId: inv.groupId
      }))
    });
  } catch (error) {
    console.error('Error sending group invitations:', error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
} 