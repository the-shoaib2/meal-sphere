
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

            // 6. Benchmark Notifications (User Specific)
            const startNotifications = performance.now();
            const notifications = await prisma.notification.findMany({
                where: { userId },
                take: 20,
                orderBy: { createdAt: 'desc' }
            });
            const endNotifications = performance.now();
            results.notifications = {
                timeMs: Math.round(endNotifications - startNotifications),
                count: notifications.length,
                status: (endNotifications - startNotifications) < 100 ? 'EXCELLENT' : (endNotifications - startNotifications) < 300 ? 'GOOD' : 'SLOW'
            };

            // 7. Benchmark Shopping Items
            const startShopping = performance.now();
            const shopping = await prisma.shoppingItem.findMany({
                where: { roomId: activeGroupId },
                take: 50
            });
            const endShopping = performance.now();
            results.shopping = {
                timeMs: Math.round(endShopping - startShopping),
                count: shopping.length,
                status: (endShopping - startShopping) < 150 ? 'EXCELLENT' : (endShopping - startShopping) < 400 ? 'GOOD' : 'SLOW'
            };

            // 8. Benchmark Payments
            const startPayments = performance.now();
            const payments = await prisma.payment.findMany({
                where: { roomId: activeGroupId },
                take: 50
            });
            const endPayments = performance.now();
            results.payments = {
                timeMs: Math.round(endPayments - startPayments),
                count: payments.length,
                status: (endPayments - startPayments) < 150 ? 'EXCELLENT' : (endPayments - startPayments) < 400 ? 'GOOD' : 'SLOW'
            };

            // 9. Benchmark Market Dates
            const startMarket = performance.now();
            const marketDates = await prisma.marketDate.findMany({
                where: { roomId: activeGroupId },
                take: 20
            });
            const endMarket = performance.now();
            results.marketDates = {
                timeMs: Math.round(endMarket - startMarket),
                count: marketDates.length,
                status: (endMarket - startMarket) < 100 ? 'EXCELLENT' : (endMarket - startMarket) < 300 ? 'GOOD' : 'SLOW'
            };

            // 10. Benchmark Group Messages
            const startMessages = performance.now();
            const messages = await prisma.groupMessage.findMany({
                where: { roomId: activeGroupId },
                take: 20,
                orderBy: { createdAt: 'desc' }
            });
            const endMessages = performance.now();
            results.messages = {
                timeMs: Math.round(endMessages - startMessages),
                count: messages.length,
                status: (endMessages - startMessages) < 100 ? 'EXCELLENT' : (endMessages - startMessages) < 300 ? 'GOOD' : 'SLOW'
            };

            // 11. Benchmark Periods List
            const startPeriods = performance.now();
            const periods = await prisma.mealPeriod.findMany({
                where: { roomId: activeGroupId },
                take: 20,
                orderBy: { createdAt: 'desc' }
            });
            const endPeriods = performance.now();
            results.periods = {
                timeMs: Math.round(endPeriods - startPeriods),
                count: periods.length,
                status: (endPeriods - startPeriods) < 100 ? 'EXCELLENT' : (endPeriods - startPeriods) < 300 ? 'GOOD' : 'SLOW'
            };

            // 12. Benchmark Guest Meals
            const startGuestMeals = performance.now();
            const guestMeals = await prisma.guestMeal.findMany({
                where: { roomId: activeGroupId, periodId },
                take: 50
            });
            const endGuestMeals = performance.now();
            results.guestMeals = {
                timeMs: Math.round(endGuestMeals - startGuestMeals),
                count: guestMeals.length,
                status: (endGuestMeals - startGuestMeals) < 150 ? 'EXCELLENT' : (endGuestMeals - startGuestMeals) < 400 ? 'GOOD' : 'SLOW'
            };

            // 13. Benchmark Votes
            const startVotes = performance.now();
            const votes = await prisma.vote.findMany({
                where: { roomId: activeGroupId },
                take: 20
            });
            const endVotes = performance.now();
            results.votes = {
                timeMs: Math.round(endVotes - startVotes),
                count: votes.length,
                status: (endVotes - startVotes) < 100 ? 'EXCELLENT' : (endVotes - startVotes) < 300 ? 'GOOD' : 'SLOW'
            };

            // 14. Benchmark Group Members
            const startMembers = performance.now();
            const members = await prisma.roomMember.findMany({
                where: { roomId: activeGroupId },
                include: { user: { select: { name: true, image: true, email: true } } }
            });
            const endMembers = performance.now();
            results.members = {
                timeMs: Math.round(endMembers - startMembers),
                count: members.length,
                status: (endMembers - startMembers) < 100 ? 'EXCELLENT' : (endMembers - startMembers) < 300 ? 'GOOD' : 'SLOW'
            };

            // 15. Benchmark Join Requests
            const startJoinRequests = performance.now();
            const joinRequests = await prisma.joinRequest.findMany({
                where: { roomId: activeGroupId },
                take: 20
            });
            const endJoinRequests = performance.now();
            results.joinRequests = {
                timeMs: Math.round(endJoinRequests - startJoinRequests),
                count: joinRequests.length,
                status: (endJoinRequests - startJoinRequests) < 100 ? 'EXCELLENT' : (endJoinRequests - startJoinRequests) < 300 ? 'GOOD' : 'SLOW'
            };

            // 16. Benchmark Announcements
            const startAnnouncements = performance.now();
            const announcements = await prisma.announcement.findMany({
                where: { roomId: activeGroupId },
                take: 20,
                orderBy: { createdAt: 'desc' }
            });
            const endAnnouncements = performance.now();
            results.announcements = {
                timeMs: Math.round(endAnnouncements - startAnnouncements),
                count: announcements.length,
                status: (endAnnouncements - startAnnouncements) < 100 ? 'EXCELLENT' : (endAnnouncements - startAnnouncements) < 300 ? 'GOOD' : 'SLOW'
            };

            // 17. Benchmark Activity Logs
            const startActivityLogs = performance.now();
            const activityLogs = await prisma.groupActivityLog.findMany({
                where: { roomId: activeGroupId },
                take: 50,
                orderBy: { createdAt: 'desc' }
            });
            const endActivityLogs = performance.now();
            results.activityLogs = {
                timeMs: Math.round(endActivityLogs - startActivityLogs),
                count: activityLogs.length,
                status: (endActivityLogs - startActivityLogs) < 150 ? 'EXCELLENT' : (endActivityLogs - startActivityLogs) < 400 ? 'GOOD' : 'SLOW'
            };

        } else {
            results.note = "No active groups found to benchmark detailed endpoints.";
        }

        // 18. Benchmark System Health (Simple Ping)
        const startPing = performance.now();
        // Use $runCommandRaw for MongoDB instead of $queryRaw
        await prisma.$runCommandRaw({ ping: 1 });
        const endPing = performance.now();
        results.databaseLatency = {
            timeMs: Math.round(endPing - startPing),
            status: (endPing - startPing) < 20 ? 'LIGHTNING' : (endPing - startPing) < 100 ? 'NORMAL' : 'LAGGY'
        };

        // Calculate overall statistics
        const allTimings = Object.values(results)
            .filter((r: any) => r.timeMs !== undefined)
            .map((r: any) => r.timeMs);

        const totalTime = allTimings.reduce((sum, time) => sum + time, 0);
        const avgTime = Math.round(totalTime / allTimings.length);
        const slowestEndpoint = Object.entries(results)
            .filter(([_, r]: any) => r.timeMs !== undefined)
            .sort(([_, a]: any, [__, b]: any) => b.timeMs - a.timeMs)[0];

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            summary: {
                totalEndpoints: allTimings.length,
                totalTimeMs: totalTime,
                averageTimeMs: avgTime,
                slowestEndpoint: slowestEndpoint ? {
                    name: slowestEndpoint[0],
                    timeMs: (slowestEndpoint[1] as any).timeMs
                } : null
            },
            results
        });

    } catch (error: any) {
        console.error("Benchmark API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
