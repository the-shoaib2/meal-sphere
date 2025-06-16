import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const groupId = context.params.id;

    // Check if user is admin
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId
        }
      },
      select: { role: true }
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get activity logs
    const logs = await prisma.groupActivityLog.findMany({
      where: {
        roomId: groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 activities
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[ACTIVITY_LOGS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 