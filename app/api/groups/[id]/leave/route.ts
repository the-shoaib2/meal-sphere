import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role, NotificationType } from "@prisma/client";

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
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

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
      return NextResponse.json(
        { error: 'Group not found' }, 
        { status: 404 }
      );
    }

    const membership = group.members[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this group' }, 
        { status: 400 }
      );
    }

    // Check if user is the creator
    if (group.createdBy === session.user.id) {
      return NextResponse.json(
        { error: 'CREATOR_CANNOT_LEAVE' }, 
        { status: 400 }
      );
    }

    // Remove membership
    await prisma.roomMember.delete({
      where: {
        id: membership.id
      }
    });

    return NextResponse.json(
      { message: 'Successfully left the group' }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
} 