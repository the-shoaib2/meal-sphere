import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { getPeriodForDate } from '@/lib/utils/period-utils';
import { revalidateTag as _revalidateTag } from 'next/cache';

const revalidateTag = _revalidateTag as any;

/**
 * POST /api/meals/guest
 * Add a guest meal
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { date, type, roomId, count = 1, periodId } = body;

  if (!date || !type || !roomId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Normalize to UTC midnight
    const [year, month, day] = String(date).split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));

    let finalPeriodId = periodId;
    if (!finalPeriodId) {
      const period = await getPeriodForDate(roomId, targetDate);
      finalPeriodId = period?.id || null;
    }

    const guestMeal = await prisma.guestMeal.create({
      data: {
        date: targetDate,
        type,
        roomId,
        userId: session.user.id,
        count,
        periodId: finalPeriodId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });

    // Bust SSR cache
    revalidateTag('meals', 'max');
    revalidateTag(`group-${roomId}`, 'max');

    return NextResponse.json({
      ...guestMeal,
      date: guestMeal.date.toISOString(),
      createdAt: guestMeal.createdAt.toISOString(),
      updatedAt: guestMeal.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/meals/guest:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
