import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is admin
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: id
        },
        role: {
          in: ['ADMIN', 'MODERATOR']
        }
      }
    });

    if (!membership) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get activity logs
    const activities = await prisma.groupActivityLog.findMany({
      where: {
        roomId: id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 activities
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 