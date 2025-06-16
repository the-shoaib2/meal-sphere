import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role, NotificationType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: groupId } = params;

    // Get the group and membership
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
        }
      }
    });

    if (!group) {
      return new NextResponse('Group not found', { status: 404 });
    }

    const membership = group.members[0];
    if (!membership) {
      return new NextResponse('Not a member of this group', { status: 400 });
    }

    // Check if user is the creator
    if (group.createdBy === session.user.id) {
      return new NextResponse('CREATOR_CANNOT_LEAVE', { status: 400 });
    }

    // Remove membership
    await prisma.roomMember.delete({
      where: {
        id: membership.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error leaving group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 