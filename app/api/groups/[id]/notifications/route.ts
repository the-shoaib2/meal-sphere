import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/services/groups-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    const updatedSettings = await updateNotificationSettings(id, session.user.id, body);

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('[GROUP_NOTIFICATIONS_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const settings = await getNotificationSettings(id, session.user.id);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[GROUP_NOTIFICATIONS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 