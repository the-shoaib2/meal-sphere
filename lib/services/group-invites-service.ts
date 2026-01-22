import { prisma } from "@/lib/services/prisma";
import { sendGroupInviteEmail } from "@/lib/services/email-utils";
import { nanoid } from 'nanoid';
import { Role } from "@prisma/client";

export class GroupInvitesService {
  static async generateLinkToken(groupId: string, userId: string, role: Role = 'MEMBER') {
    // Generate a secure random token
    const token = nanoid(32);
    
    // Create token in database
    const inviteToken = await prisma.inviteToken.create({
      data: {
        token,
        roomId: groupId,
        createdBy: userId,
        role: role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      }
    });

    return inviteToken;
  }

  static async sendEmailInvites(
    groupId: string, 
    userId: string, 
    emails: string[], 
    role: Role = 'MEMBER',
    sender: { name: string; email: string; image: string | null },
    origin: string
  ) {
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: { name: true }
    });

    if (!group) {
        throw new Error('Group not found');
    }

    const results = await Promise.all(emails.map(async (email) => {
      try {
        // Create invitation record
        const code = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.invitation.create({
            data: {
                code,
                email,
                role: role,
                groupId,
                createdBy: userId,
                expiresAt
            }
        });

        const inviteUrl = `${origin}/join/invite/${code}`;

        // Send email
        await sendGroupInviteEmail(
            email,
            email.split('@')[0], // Use part of email as name fallback
            group.name,
            inviteUrl,
            role as string, // Cast to string if email util expects string
            sender
        );

        return { email, success: true };
      } catch (err) {
        console.error(`Failed to invite ${email}:`, err);
        return { email, success: false, error: 'Failed to send invite' };
      }
    }));

    return results;
  }
}
