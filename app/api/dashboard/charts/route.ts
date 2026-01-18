import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('groupId') || 
            (await prisma.roomMember.findFirst({ where: { userId: session.user.id, isCurrent: true } }))?.roomId ||
            (await prisma.roomMember.findFirst({ where: { userId: session.user.id } }))?.roomId;

        if (!groupId) return NextResponse.json({ error: 'No group found' }, { status: 404 });

        const cacheKey = `dashboard:charts:${groupId}`;
        const data = await cacheGetOrSet(cacheKey, async () => {
             const now = new Date();
             const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
             const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

             const [mealsByDate, expensesByDate] = await Promise.all([
                 prisma.meal.groupBy({
                    by: ['date'],
                    where: { roomId: groupId, date: { gte: startOfMonth, lte: endOfMonth } },
                    _count: { id: true }
                 }),
                 prisma.extraExpense.groupBy({
                    by: ['date'],
                    where: { roomId: groupId, date: { gte: startOfMonth, lte: endOfMonth } },
                    _sum: { amount: true }
                 })
             ]);

            const mealsMap = new Map(mealsByDate.map((m: any) => [m.date.toISOString().split('T')[0], m._count.id]));
            const expensesMap = new Map(expensesByDate.map((e: any) => [e.date.toISOString().split('T')[0], e._sum.amount]));
            
            const chartData = [];
            const currentDate = new Date(startOfMonth);
            while (currentDate <= endOfMonth) {
                const dateString = currentDate.toISOString().split('T')[0];
                chartData.push({
                    date: dateString, 
                    meals: mealsMap.get(dateString) || 0, 
                    expenses: expensesMap.get(dateString) || 0, 
                    balance: 0 // Balance history is complex, skipping for now as per original implementation shortcut or logic
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return chartData;

        }, { ttl: CACHE_TTL.DASHBOARD });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
