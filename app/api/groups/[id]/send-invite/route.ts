import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { sendGroupInviteEmail } from "@/lib/email-utils";
import { z } from "zod";

// Validation schema for the request body
const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;
    
    // Validate request body
    const body = await request.json();
    const validationResult = inviteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { emails, role } = validationResult.data;

    // Remove duplicate emails
    const uniqueEmails = [...new Set(emails)];

    // Get group details and verify permissions
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        members: {
          where: {
            userId: session.user.id,
            role: {
              in: ["ADMIN", "OWNER"]
            }
          }
        }
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    if (group.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to invite members to this group" },
        { status: 403 }
      );
    }

    // Get sender's information
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true
      }
    });

    if (!sender) {
      return NextResponse.json(
        { error: "Sender not found" },
        { status: 404 }
      );
    }

    // Check for existing members
    const existingMembers = await prisma.roomMember.findMany({
      where: {
        roomId: groupId,
        userId: {
          in: await prisma.user.findMany({
            where: {
              email: {
                in: uniqueEmails
              }
            },
            select: {
              id: true
            }
          }).then(users => users.map(u => u.id))
        }
      },
      select: {
        userId: true
      }
    });

    // Get user emails for existing members
    const existingMemberEmails = await prisma.user.findMany({
      where: {
        id: {
          in: existingMembers.map(m => m.userId)
        }
      },
      select: {
        email: true
      }
    }).then(users => users.map(u => u.email));

    // Check for existing invitations
    const existingInvitations = await prisma.invitation.findMany({
      where: {
        email: {
          in: uniqueEmails
        },
        groupId,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    // Filter out emails that are already members or have pending invitations
    const validEmails = uniqueEmails.filter(email => {
      const isMember = existingMemberEmails.includes(email);
      const hasInvitation = existingInvitations.some(i => i.email === email);
      return !isMember && !hasInvitation;
    });

    const skippedEmails = {
      existingMembers: existingMemberEmails,
      pendingInvitations: existingInvitations.map(i => i.email)
    };

    // If all emails are either members or have pending invitations, return success
    if (validEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All emails are already members or have pending invitations`,
        details: {
          existingMembers: existingMemberEmails,
          pendingInvitations: existingInvitations.map(i => i.email)
        }
      });
    }

    // Create invitations and send emails
    const invitations = await Promise.all(
      validEmails.map(async (email) => {
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
          role,
          sender
        );

        return invitation;
      })
    );

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${invitations.length} invitation(s). ${
        skippedEmails.existingMembers.length > 0 || skippedEmails.pendingInvitations.length > 0
          ? `(${skippedEmails.existingMembers.length} already members, ${skippedEmails.pendingInvitations.length} pending invitations)`
          : ''
      }`,
      invitations: invitations.map(inv => ({
        code: inv.code,
        email: inv.email,
        expiresAt: inv.expiresAt,
        groupId: inv.groupId
      })),
      skipped: skippedEmails
    });
  } catch (error) {
    console.error('Error sending group invitations:', error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
} 