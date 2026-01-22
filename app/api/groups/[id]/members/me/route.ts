import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { leaveGroup } from '@/lib/services/groups-service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const groupId = resolvedParams.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await leaveGroup(groupId, session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error leaving group:', error);
    if (error instanceof Error && error.message.includes('Not a member')) {
        return new NextResponse('You are not a member of this group', { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
