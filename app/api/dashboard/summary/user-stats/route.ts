import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { calculateBalance, calculateUserMealCount, calculateAvailableBalance, calculateMealRate } from '@/lib/services/balance-service';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        let groupId = searchParams.get('groupId');
        
        // Resolve Group
        let membership;
        if (groupId) {
             membership = await prisma.roomMember.findFirst({
                  where: { userId: session.user.id, roomId: groupId },
                  select: { roomId: true, role: true }
             });
        } else {
             membership = await prisma.roomMember.findFirst({
                 where: { userId: session.user.id, isCurrent: true },
                 select: { roomId: true, role: true }
             });
             if (!membership) {
                 membership = await prisma.roomMember.findFirst({
                     where: { userId: session.user.id },
                     orderBy: { joinedAt: 'desc' },
                     select: { roomId: true, role: true }
                 });
             }
        }

        if (!membership) {
            // Return default empty stats for user
            return NextResponse.json({
                totalUserMeals: 0,
                currentBalance: 0,
                availableBalance: 0,
                totalSpent: 0,
                activeGroups: 0
            });
        }
        groupId = membership.roomId;

        // Cache Key for User Stats
        const cacheKey = `dashboard:user-stats:${session.user.id}:${groupId}`;
        const data = await cacheGetOrSet(cacheKey, async () => {
            const currentPeriod = await getCurrentPeriod(groupId!);
            const periodId = currentPeriod?.id;

            // Parallel fetch for user metrics
            const [
                userMealCount,
                currentBalance,
                activeGroupsCount,
                mealRateData
            ] = await Promise.all([
                calculateUserMealCount(session.user.id, groupId!, periodId),
                calculateBalance(session.user.id, groupId!, periodId),
                prisma.roomMember.count({ where: { userId: session.user.id, isBanned: false } }),
                calculateMealRate(groupId!, periodId)
            ]);

            const mealRate = mealRateData.mealRate;
            const totalSpent = userMealCount * mealRate;
            const availableBalance = currentBalance - totalSpent;

            return {
                totalUserMeals: userMealCount,
                currentBalance,
                availableBalance,
                totalSpent,
                activeGroups: activeGroupsCount
            };
        }, { ttl: CACHE_TTL.DASHBOARD }); 

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
