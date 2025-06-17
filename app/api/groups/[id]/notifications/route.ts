import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { groupMessages, announcements, mealUpdates, memberActivity, joinRequests } = body;

    // Update notification settings
    const updatedSettings = await prisma.groupNotificationSettings.upsert({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: params.id,
        },
      },
      create: {
        userId: session.user.id,
        groupId: params.id,
        groupMessages,
        announcements,
        mealUpdates,
        memberActivity,
        joinRequests,
      },
      update: {
        groupMessages,
        announcements,
        mealUpdates,
        memberActivity,
        joinRequests,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('[GROUP_NOTIFICATIONS_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await prisma.groupNotificationSettings.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: params.id,
        },
      },
    });

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        groupMessages: true,
        announcements: true,
        mealUpdates: true,
        memberActivity: true,
        joinRequests: false,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[GROUP_NOTIFICATIONS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 