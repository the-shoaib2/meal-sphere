import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

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

        const cacheKey = `dashboard:activities:${groupId}`;
        const data = await cacheGetOrSet(cacheKey, async () => {
             const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
             
             // Fetch recent items
             const [meals, payments, expenses, shopping, activityLogs] = await Promise.all([
                 prisma.meal.findMany({
                     where: { roomId: groupId, date: { gte: sevenDaysAgo } },
                     select: { id: true, date: true, type: true, user: { select: { name: true, image: true } } },
                     orderBy: { date: 'desc' }, take: 10
                 }),
                 prisma.payment.findMany({
                     where: { roomId: groupId, date: { gte: sevenDaysAgo } },
                     select: { id: true, date: true, amount: true, method: true, status: true, user: { select: { name: true, image: true } } },
                     orderBy: { date: 'desc' }, take: 10
                 }),
                 prisma.extraExpense.findMany({
                     where: { roomId: groupId, date: { gte: sevenDaysAgo } },
                     select: { id: true, date: true, description: true, amount: true, type: true, user: { select: { name: true, image: true } } },
                     orderBy: { date: 'desc' }, take: 10
                 }),
                 prisma.shoppingItem.findMany({
                     where: { roomId: groupId, date: { gte: sevenDaysAgo } },
                     select: { id: true, name: true, date: true, purchased: true, user: { select: { name: true, image: true } } },
                     orderBy: { date: 'desc' }, take: 10
                 }),
                 prisma.groupActivityLog.findMany({
                     where: { roomId: groupId, createdAt: { gte: sevenDaysAgo } },
                     select: { id: true, type: true, createdAt: true, user: { select: { name: true, image: true } } },
                     orderBy: { createdAt: 'desc' }, take: 10
                 })
             ]);

             // Consolidate
             const allActivities = [
                ...meals.map((meal: any) => ({
                    id: meal.id, type: 'MEAL' as const, title: `${meal.type.toLocaleLowerCase()} added`,
                    description: `${meal.user.name} added ${meal.type.toLocaleLowerCase()}`,
                    timestamp: meal.date.toISOString(), user: meal.user, icon: 'Utensils'
                })),
                ...payments.map((payment: any) => ({
                    id: payment.id, type: 'PAYMENT' as const, title: `Payment ${payment.status.toLowerCase()}`,
                    description: `${payment.user.name} made a ${payment.method.toLowerCase()} payment`,
                    timestamp: payment.date.toISOString(), user: payment.user, amount: payment.amount, icon: 'CreditCard'
                })),
                ...shopping.map((item: any) => ({
                    id: item.id, type: 'SHOPPING' as const, title: item.purchased ? 'Item purchased' : 'Item added to list',
                    description: `${item.user.name} ${item.purchased ? 'purchased' : 'added'} ${item.name}`,
                    timestamp: item.date.toISOString(), user: item.user, icon: 'ShoppingBag'
                })),
                ...expenses.map((expense: any) => ({
                    id: expense.id, type: 'EXPENSE' as const, title: `${expense.type.toLowerCase()} expense added`,
                    description: `${expense.user.name} added ${expense.description}`,
                    timestamp: expense.date.toISOString(), user: expense.user, amount: expense.amount, icon: 'Receipt'
                })),
                ...activityLogs.map((activity: any) => ({
                    id: activity.id, type: 'ACTIVITY' as const, title: activity.type.replace(/_/g, ' ').toLowerCase(),
                    description: `${activity.user.name} performed an action`,
                    timestamp: activity.createdAt.toISOString(), user: activity.user, icon: 'Users'
                }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);

            return allActivities;

        }, { ttl: CACHE_TTL.DASHBOARD });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
