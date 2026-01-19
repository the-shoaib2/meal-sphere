import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { calculateBalance, calculateUserMealCount, getGroupBalanceSummary } from '@/lib/services/balance-service';
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
        
        // Cache membership resolution (finding the relevant group)
        // ALIGNMENT: Use same cache key logic as group-stats for consistency
        const membershipCacheKey = `group_membership:${session.user.id}:${groupId || 'default'}`;
        const membership = await cacheGetOrSet(membershipCacheKey, async () => {
             if (groupId) {
                 return await prisma.roomMember.findFirst({
                      where: { userId: session.user.id, roomId: groupId },
                      select: { roomId: true, role: true }
                 });
             } else {
                 let m = await prisma.roomMember.findFirst({
                     where: { userId: session.user.id, isCurrent: true },
                     select: { roomId: true, role: true }
                 });
                 if (!m) {
                     m = await prisma.roomMember.findFirst({
                         where: { userId: session.user.id },
                         orderBy: { joinedAt: 'desc' },
                         select: { roomId: true, role: true }
                     });
                 }
                 return m;
             }
        }, { ttl: CACHE_TTL.GROUPS_LIST });

        if (!membership) {
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

            // Parallel fetch:
            // 1. User specific metrics (Balance, Meal Count, Active Groups)
            // 2. Group shared metrics (Meal Rate - via getGroupBalanceSummary) 
            //    Using getGroupBalanceSummary allows us to leverage its rigorous caching and parallelized logic.
            
            const [
                userMealCount,
                currentBalance,
                activeGroupsCount,
                groupSummary // Fetch simple summary for rate
            ] = await Promise.all([
                calculateUserMealCount(session.user.id, groupId!, periodId),
                calculateBalance(session.user.id, groupId!, periodId),
                prisma.roomMember.count({ where: { userId: session.user.id, isBanned: false } }),
                getGroupBalanceSummary(groupId!, false) 
            ]);

            const mealRate = groupSummary.mealRate; // Reuse the robust rate calculation
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
