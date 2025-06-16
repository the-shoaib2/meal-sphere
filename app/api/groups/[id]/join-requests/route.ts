import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const groupId = params.id;

    // Check if user is admin or moderator of the group
    const membership = await prisma.roomMember.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id,
        role: {
          in: ['ADMIN', 'MODERATOR']
        }
      }
    });

    if (!membership) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch pending join requests
    const joinRequests = await prisma.joinRequest.findMany({
      where: {
        roomId: groupId,
        status: 'PENDING'
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
      }
    });

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 