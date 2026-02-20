import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { getPeriodForDate } from '@/lib/utils/period-utils';
import { revalidateTag, unstable_cache } from 'next/cache';

/**
 * Normalize a date string or Date to UTC midnight to avoid timezone issues.
 * Accepts 'yyyy-MM-dd' strings or Date objects.
 */
function normalizeToUTCMidnight(dateInput: string | Date): Date {
  if (typeof dateInput === 'string') {
    // 'yyyy-MM-dd' → UTC midnight
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * GET /api/meals?roomId=&date=yyyy-MM-dd
 * Returns meals and guest meals for the period containing the given date.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const dateStr = searchParams.get('date');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  try {
    const targetDate = dateStr ? normalizeToUTCMidnight(dateStr) : new Date();
    const period = await getPeriodForDate(roomId, targetDate);

    if (!period) {
      return NextResponse.json({ meals: [], guestMeals: [], period: null });
    }

    // Use unstable_cache for high-speed performance
    const getCachedData = unstable_cache(
      async () => {
        const [meals, guestMeals] = await Promise.all([
          prisma.meal.findMany({
            where: { roomId, periodId: period.id },
            include: {
              user: { select: { id: true, name: true, image: true } }
            },
            orderBy: { date: 'desc' }
          }),
          prisma.guestMeal.findMany({
            where: { roomId, periodId: period.id },
            include: {
              user: { select: { id: true, name: true, image: true } }
            },
            orderBy: { date: 'desc' }
          })
        ]);

        return {
          meals: meals.map(m => ({
            ...m,
            date: m.date.toISOString(),
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          })),
          guestMeals: guestMeals.map(m => ({
            ...m,
            date: m.date.toISOString(),
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          }))
        };
      },
      [`meals-data-${roomId}-${period.id}`],
      {
        revalidate: 3600, // 1 hour backup revalidation
        tags: ['meals', `group-${roomId}`]
      }
    );

    const data = await getCachedData();

    return NextResponse.json({
      ...data,
      period
    });
  } catch (error) {
    console.error('Error in GET /api/meals:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meals
 * Body: { date: 'yyyy-MM-dd', type: MealType, roomId: string, action: 'add' | 'remove' }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { date, type, roomId, action, userId } = body;

  if (!date || !type || !roomId || !action) {
    return NextResponse.json({ error: 'Missing required fields: date, type, roomId, action' }, { status: 400 });
  }

  const targetUserId = userId || session.user.id;

  try {
    // If acting on behalf of another user, verify privileges
    if (targetUserId !== session.user.id) {
      const roomMember = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId,
          },
        },
      });

      if (!roomMember || !['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(roomMember.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to manage meals for other users' },
          { status: 403 }
        );
      }
    }
    // Always normalize to UTC midnight to avoid timezone-driven mismatches
    const targetDate = normalizeToUTCMidnight(date);
    const period = await getPeriodForDate(roomId, targetDate);

    if (action === 'add') {
      const meal = await prisma.meal.upsert({
        where: {
          userId_roomId_date_type: {
            userId: targetUserId,
            roomId,
            date: targetDate,
            type,
          }
        },
        create: {
          date: targetDate,
          type,
          roomId,
          userId: targetUserId,
          periodId: period?.id || null,
        },
        update: {
          periodId: period?.id || null,
        },
        include: {
          user: { select: { id: true, name: true, image: true } }
        }
      });

      // Bust the SSR cache so the next server render is fresh
      revalidateTag('meals', 'max');
      revalidateTag(`group-${roomId}`, 'max');

      // Serialize dates
      return NextResponse.json({
        meal: {
          ...meal,
          date: meal.date.toISOString(),
          createdAt: meal.createdAt.toISOString(),
          updatedAt: meal.updatedAt.toISOString(),
        }
      });
    } else {
      // Remove - use a date range to handle any timezone offset in stored data
      const dayStart = new Date(targetDate);
      const dayEnd = new Date(targetDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const result = await prisma.meal.deleteMany({
        where: {
          userId: targetUserId,
          roomId,
          type,
          date: {
            gte: dayStart,
            lte: dayEnd,
          }
        }
      });

      // Bust the SSR cache
      revalidateTag('meals', 'max');
      revalidateTag(`group-${roomId}`, 'max');

      return NextResponse.json({ success: true, count: result.count });
    }
  } catch (error) {
    console.error('Error in POST /api/meals:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
