
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentPeriod } from '@/lib/period-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const results: any = {};

    try {
        // 1. Benchmark Groups Fetching (Optimized)
        const startGroups = performance.now();
        const groups = await prisma.roomMember.findMany({
            where: { userId, room: { isActive: true } },
            include: {
                room: {
                    select: {
                        id: true,
                        name: true,
                        isPrivate: true,
                        createdByUser: { select: { id: true, name: true, image: true } },
                        members: { where: { userId }, select: { role: true, joinedAt: true } },
                        _count: { select: { members: true } }
                    }
                }
            }
        });
        const endGroups = performance.now();
        results.groups = {
            timeMs: Math.round(endGroups - startGroups),
            count: groups.length,
            status: (endGroups - startGroups) < 200 ? 'EXCELLENT' : (endGroups - startGroups) < 500 ? 'GOOD' : 'SLOW'
        };

        // Use the first group for detailed benchmarks if available
        const activeGroupId = groups[0]?.room.id;

        if (activeGroupId) {
            // 2. Benchmark Dashboard Summary (Heavy Calculation)
            const startDashboard = performance.now();

            const currentPeriod = await getCurrentPeriod(activeGroupId);
            const periodId = currentPeriod?.id;

            // Simulate the dashboard summary parallel logic
            await Promise.all([
                prisma.meal.count({ where: { userId, roomId: activeGroupId, periodId } }),
                prisma.meal.count({ where: { roomId: activeGroupId, periodId } }),
                prisma.extraExpense.aggregate({ where: { roomId: activeGroupId, periodId }, _sum: { amount: true } }),
                prisma.accountTransaction.findMany({
                    where: { roomId: activeGroupId, periodId, OR: [{ targetUserId: userId }, { AND: [{ userId }, { targetUserId: userId }] }] },
                    select: { amount: true, targetUserId: true }
                })
            ]);

            const endDashboard = performance.now();
            results.dashboard = {
                timeMs: Math.round(endDashboard - startDashboard),
                context: `Group: ${groups[0].room.name}`,
                status: (endDashboard - startDashboard) < 300 ? 'EXCELLENT' : (endDashboard - startDashboard) < 800 ? 'GOOD' : 'SLOW'
            };

            // 3. Benchmark Account Balance (Very Heavy with Transactions)
            const startBalance = performance.now();
            const transactions = await prisma.accountTransaction.findMany({
                where: { roomId: activeGroupId, periodId },
                select: { id: true, amount: true, type: true, targetUserId: true, userId: true }
            });
            const endBalance = performance.now();
            results.balance = {
                timeMs: Math.round(endBalance - startBalance),
                transactionsCount: transactions.length,
                status: (endBalance - startBalance) < 200 ? 'EXCELLENT' : (endBalance - startBalance) < 500 ? 'GOOD' : 'SLOW'
            };

            // 4. Benchmark Meals List (Date Filtering)
            const startMeals = performance.now();
            const meals = await prisma.meal.findMany({
                where: { roomId: activeGroupId, periodId },
                take: 50,
                include: { user: { select: { name: true, image: true } } }
            });
            const endMeals = performance.now();
            results.meals = {
                timeMs: Math.round(endMeals - startMeals),
                count: meals.length,
                status: (endMeals - startMeals) < 150 ? 'EXCELLENT' : (endMeals - startMeals) < 400 ? 'GOOD' : 'SLOW'
            };

            // 5. Benchmark Expenses
            const startExpenses = performance.now();
            const expenses = await prisma.extraExpense.findMany({
                where: { roomId: activeGroupId, periodId },
                take: 50,
                include: { user: { select: { name: true } } }
            });
            const endExpenses = performance.now();
            results.expenses = {
                timeMs: Math.round(endExpenses - startExpenses),
                count: expenses.length,
                status: (endExpenses - startExpenses) < 150 ? 'EXCELLENT' : (endExpenses - startExpenses) < 400 ? 'GOOD' : 'SLOW'
            };

        } else {
            results.note = "No active groups found to benchmark detailed endpoints.";
        }

        // 6. Benchmark System Health (Simple Ping)
        const startPing = performance.now();
        await prisma.$queryRaw`SELECT 1`;
        const endPing = performance.now();
        results.databaseLatency = {
            timeMs: Math.round(endPing - startPing),
            status: (endPing - startPing) < 20 ? 'LIGHTNING' : (endPing - startPing) < 100 ? 'NORMAL' : 'LAGGY'
        };

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
