import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { getGroupBalanceSummary, calculateMealRate } from '@/lib/services/balance-service';
import { hasBalancePrivilege } from '@/lib/auth/balance-permissions';
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
        // This was previously uncached and slow
        const membershipCacheKey = `group_membership:${session.user.id}:${groupId || 'default'}`;
        const membership = await cacheGetOrSet(membershipCacheKey, async () => {
             if (groupId) {
                 return await prisma.roomMember.findFirst({
                      where: { userId: session.user.id, roomId: groupId },
                      select: { roomId: true, role: true, room: { select: { memberCount: true, name: true } } }
                 });
             } else {
                 let m = await prisma.roomMember.findFirst({
                     where: { userId: session.user.id, isCurrent: true },
                     select: { roomId: true, role: true, room: { select: { memberCount: true, name: true } } }
                 });
                 if (!m) {
                     m = await prisma.roomMember.findFirst({
                         where: { userId: session.user.id },
                         orderBy: { joinedAt: 'desc' },
                         select: { roomId: true, role: true, room: { select: { memberCount: true, name: true } } }
                     });
                 }
                 return m;
             }
        }, { ttl: CACHE_TTL.GROUPS_LIST });

        if (!membership) {
            // Return default empty stats for group
            return NextResponse.json({
                currentRate: 0,
                totalAllMeals: 0,
                totalMembers: 0,
                groupName: '',
                groupBalance: null
            });
        }
        groupId = membership.roomId;

        const cacheKey = `dashboard:group-stats:${session.user.id}:${groupId}`; // Include user ID because permissions vary data
        const data = await cacheGetOrSet(cacheKey, async () => {
            const isPrivileged = hasBalancePrivilege(membership!.role);
            
            // If privileged, get full summary. If not, we just need basic public stats (rate, meals)
            let groupBalance = null;
            let currentRate = 0;
            let totalAllMeals = 0;
            let totalExpenses = 0;

            if (isPrivileged) {
                groupBalance = await getGroupBalanceSummary(groupId!, true);
                currentRate = groupBalance.mealRate;
                totalAllMeals = groupBalance.totalMeals;
                totalExpenses = groupBalance.totalExpenses;
            } else {
                // For regular members, we still show the Rate and Total Meals
                const currentPeriod = await getCurrentPeriod(groupId!);
                const periodId = currentPeriod?.id;
                const stats = await calculateMealRate(groupId!, periodId);
                currentRate = stats.mealRate;
                totalAllMeals = stats.totalMeals;
                totalExpenses = stats.totalExpenses;
            }

            return {
                currentRate,
                totalAllMeals,
                totalMembers: membership!.room.memberCount,
                groupName: membership!.room.name,
                // Detailed financial stats (only present if privileged/groupBalance exists)
                groupBalance: groupBalance
            };

        }, { ttl: CACHE_TTL.DASHBOARD });

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching group stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
