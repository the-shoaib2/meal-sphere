import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { fetchGroupAccessData } from '@/lib/services/groups-service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const accessData = await fetchGroupAccessData(groupId, session.user.id);

    return NextResponse.json(accessData);
  } catch (error) {
    console.error('[GROUP_ACCESS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to check group access' },
      { status: 500 }
    );
  }
} 