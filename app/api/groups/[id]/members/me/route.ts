import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const groupId = params.id;

    // Check if the user is a member of the group
    const membership = await prisma.roomMember.findFirst({
      where: {
        userId: session.user.id,
        roomId: groupId,
      },
    });

    if (!membership) {
      return new NextResponse('You are not a member of this group', { status: 400 });
    }

    // Get all members of the group
    const groupMembers = await prisma.roomMember.findMany({
      where: { roomId: groupId },
      orderBy: { joinedAt: 'asc' } // Oldest members first
    });

    // If user is an admin and there are other members
    if (membership.role === 'ADMIN' && groupMembers.length > 1) {
      // Find another admin or the next oldest member to promote
      const nextAdmin = groupMembers.find(
        m => m.userId !== session.user.id && m.role === 'ADMIN'
      ) || groupMembers.find(m => m.userId !== session.user.id);

      // If no other admin exists, promote the next oldest member
      if (nextAdmin && nextAdmin.role !== 'ADMIN') {
        await prisma.roomMember.update({
          where: { id: nextAdmin.id },
          data: { role: 'ADMIN' }
        });
      }
    }

    // Remove the user from the group
    await prisma.roomMember.delete({
      where: { id: membership.id }
    });

    // Get updated member count
    const remainingMembers = await prisma.roomMember.count({
      where: { roomId: groupId }
    });

    // If no members left, delete the group
    if (remainingMembers === 0) {
      await prisma.room.delete({
        where: { id: groupId }
      });
      return new NextResponse(null, { status: 204 });
    }

    // Update the member count
    await prisma.room.update({
      where: { id: groupId },
      data: { memberCount: remainingMembers }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error leaving group:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
