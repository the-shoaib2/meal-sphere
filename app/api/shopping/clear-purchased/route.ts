import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { message: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the group
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: { roomId: groupId },
          select: { role: true },
        },
      },
    });

    if (!user || user.rooms.length === 0) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Delete all purchased items for the group
    await prisma.shoppingItem.deleteMany({
      where: {
        roomId: groupId,
        purchased: true,
      },
    });

    return NextResponse.json({
      message: 'Successfully cleared all purchased items',
    });
  } catch (error) {
    console.error('Error clearing purchased items:', error);
    return NextResponse.json(
      { message: 'Failed to clear purchased items' },
      { status: 500 }
    );
  }
}
