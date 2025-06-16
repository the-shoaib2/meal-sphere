import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if this is an invite token (64 characters)
    if (id.length === 64) {
      // First try to find an InviteToken
      const inviteToken = await prisma.inviteToken.findUnique({
        where: {
          token: id
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              description: true,
              isPrivate: true,
              memberCount: true,
              createdBy: true,
              createdAt: true,
              createdByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      });

      if (inviteToken) {
        // Check if token is expired
        if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
          return NextResponse.json(
            { 
              error: 'This invite token has expired',
              isInviteToken: true,
              canAccess: false
            },
            { status: 400 }
          );
        }

        // Check if token has been used
        if (inviteToken.usedAt) {
          return NextResponse.json(
            { 
              error: 'This invite token has already been used',
              isInviteToken: true,
              canAccess: false
            },
            { status: 400 }
          );
        }

        // Check if user is already a member
        const existingMember = await prisma.roomMember.findFirst({
          where: {
            roomId: inviteToken.roomId,
            userId: session.user.id
          }
        });

        if (existingMember) {
          return NextResponse.json(
            { 
              message: 'You are already a member of this group',
              isInviteToken: true,
              canAccess: true,
              groupId: inviteToken.roomId,
              isMember: true
            },
            { status: 200 }
          );
        }

        return NextResponse.json({
          isInviteToken: true,
          canAccess: true,
          groupId: inviteToken.roomId
        });
      }

      // If no InviteToken found, try to find an Invitation
      const invitation = await prisma.invitation.findFirst({
        where: {
          code: id
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              isPrivate: true,
              memberCount: true,
              createdBy: true,
              createdAt: true,
              createdByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      });

      if (!invitation) {
        return NextResponse.json(
          { 
            error: 'Invalid invite token',
            isInviteToken: true,
            canAccess: false
          },
          { status: 400 }
        );
      }

      // Check if invitation has been used
      if (invitation.usedAt) {
        return NextResponse.json(
          { 
            error: 'This invitation has already been used',
            isInviteToken: true,
            canAccess: false
          },
          { status: 400 }
        );
      }

      // Check if invitation has expired
      if (invitation.expiresAt < new Date()) {
        return NextResponse.json(
          { 
            error: 'This invitation has expired',
            isInviteToken: true,
            canAccess: false
          },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.roomMember.findFirst({
        where: {
          roomId: invitation.groupId,
          userId: session.user.id
        }
      });

      if (existingMember) {
        return NextResponse.json(
          { 
            message: 'You are already a member of this group',
            isInviteToken: true,
            canAccess: true,
            groupId: invitation.groupId,
            isMember: true
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        isInviteToken: true,
        canAccess: true,
        groupId: invitation.groupId
      });
    }

    // Regular group access check
    const group = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { 
          error: 'Group not found',
          isInviteToken: false,
          canAccess: false
        },
        { status: 404 }
      );
    }

    const isMember = group.members.length > 0;

    return NextResponse.json({
      isInviteToken: false,
      canAccess: !group.isPrivate || isMember,
      groupId: group.id,
      isMember
    });
  } catch (error) {
    console.error('Error checking group access:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check group access',
        isInviteToken: false,
        canAccess: false
      },
      { status: 500 }
    );
  }
} 