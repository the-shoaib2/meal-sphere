import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: groupId } = await Promise.resolve(params);
    const userId = session.user.id;

    // Get the group and check if user is the creator
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId },
          select: { role: true, userId: true }
        }
      }
    });

    if (!group) {
      return new NextResponse("Group not found", { status: 404 });
    }

    // Check if user is the creator
    if (group.createdBy === userId) {
      return new NextResponse(
        JSON.stringify({
          error: "Group creator cannot leave. Please transfer ownership or delete the group.",
          code: "CREATOR_CANNOT_LEAVE"
        }),
        { status: 400 }
      );
    }

    // Check if user is a member
    const userMembership = group.members[0];
    if (!userMembership) {
      return new NextResponse("You are not a member of this group", { status: 400 });
    }

    // Delete the membership
    await prisma.roomMember.delete({
      where: {
        userId_roomId: {
          userId,
          roomId: groupId
        }
      }
    });

    // Update member count
    await prisma.room.update({
      where: { id: groupId },
      data: {
        memberCount: {
          decrement: 1
        }
      }
    });

    // Create notification for group members
    await prisma.notification.createMany({
      data: group.members.map(member => ({
        userId: member.userId,
        type: "MEMBER_REMOVED",
        message: `${session.user.name || "A member"} has left the group ${group.name}`
      }))
    });

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[GROUP_LEAVE]", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
} 