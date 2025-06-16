import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { token } = await params;

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            maxMembers: true,
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

    if (!inviteToken) {
      return new NextResponse('Invalid or expired invite token', { status: 404 });
    }

    if (inviteToken.expiresAt && new Date(inviteToken.expiresAt) < new Date()) {
      return new NextResponse('Invite token has expired', { status: 400 });
    }

    if (inviteToken.usedAt) {
      return new NextResponse('Invite token has already been used', { status: 400 });
    }

    return NextResponse.json(inviteToken);
  } catch (error) {
    console.error('Error validating invite token:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { token } = await params;

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            isPrivate: true,
            maxMembers: true,
            members: {
              where: {
                userId: session.user.id
              }
            }
          }
        }
      }
    });

    if (!inviteToken) {
      return new NextResponse('Invalid or expired invite token', { status: 404 });
    }

    if (inviteToken.expiresAt && new Date(inviteToken.expiresAt) < new Date()) {
      return new NextResponse('Invite token has expired', { status: 400 });
    }

    if (inviteToken.usedAt) {
      return new NextResponse('Invite token has already been used', { status: 400 });
    }

    // Check if user is already a member
    if (inviteToken.room.members.length > 0) {
      return new NextResponse('Already a member of this group', { status: 400 });
    }

    // Check if group is full
    const memberCount = await prisma.roomMember.count({
      where: { roomId: inviteToken.room.id }
    });

    if (inviteToken.room.maxMembers && memberCount >= inviteToken.room.maxMembers) {
      return new NextResponse('Group is full', { status: 400 });
    }

    // Create membership and update member count in a transaction
    const result = await prisma.$transaction([
      prisma.roomMember.create({
        data: {
          userId: session.user.id,
          roomId: inviteToken.room.id,
          role: inviteToken.role
        }
      }),
      prisma.inviteToken.update({
        where: { id: inviteToken.id },
        data: {
          usedAt: new Date()
        }
      })
    ]);

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error joining group with token:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 