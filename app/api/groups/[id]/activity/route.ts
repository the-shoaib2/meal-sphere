import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";

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

    // OPTIMIZED: Parallel queries for membership check and activity logs
    const [membership, activities] = await Promise.all([
      prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: id
          }
        },
        select: {
          role: true,
          isBanned: true
        }
      }),
      prisma.groupActivityLog.findMany({
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
      })
    ]);

    // Check if user is admin/moderator after fetching data
    if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (membership.isBanned) {
      return new NextResponse("You are banned from this group", { status: 403 });
    }

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}