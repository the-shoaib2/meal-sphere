import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';

// Services
import { fetchDashboardData } from '@/lib/services/dashboard-service';
import { fetchGroupAccessData } from '@/lib/services/groups-service';

// UI Components
import { RefreshButton } from '@/components/dashboard/refresh-button';
import DetailedAnalytics from '@/components/dashboard/detailed-analytics';
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { DashboardActivity } from '@/components/dashboard/dashboard-activity';
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { PageHeader } from '@/components/shared/page-header';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    // 1. Resolve Active Group
    const activeMember = await prisma.roomMember.findFirst({
        where: { userId: session.user.id, isCurrent: true },
        select: { roomId: true }
    });

    const activeGroupId = activeMember?.roomId;

    if (!activeGroupId) {
        return (
            <div className="space-y-6">
                <PageHeader
                    heading="Dashboard"
                    text="Welcome to MealSphere! Get started by creating or joining a group."
                />
                <NoGroupState />
            </div>
        );
    }

    // 2. Fetch Data 
    const [data, accessData] = await Promise.all([
        fetchDashboardData(session.user.id, activeGroupId),
        fetchGroupAccessData(activeGroupId, session.user.id)
    ]);

    // 3. Handle No Period State server-side
    // Using simple check for periodId in summary or similar
    if (!data.summary.currentPeriod) {
        const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
        return (
            <DashboardShell
                header={
                    <PageHeader heading="Dashboard" />
                }
            >
                <NoPeriodState
                    isPrivileged={isPrivileged}
                    // For dashboard, we might want a slightly different description
                    title="No Active Period"
                    description="Your dashboard is currently empty because there is no active meal period. Start a new period to see analytics, meal rates, and activity."
                />
            </DashboardShell >
        );
    }

    // 4. Render UI
    return (
        <DashboardShell
            header={
                <PageHeader heading="Dashboard">
                    <RefreshButton />
                </PageHeader>
            }
            activities={data.activities}
            chartData={data.chartData}
        >
            <div className="space-y-4 sm:space-y-6">
                {/* Overview Section */}
                <DashboardOverview summaryData={data.summary} />

                {/* Activity Section */}
                <DashboardActivity />

                {/* Quick Actions Section */}
                <DashboardQuickActions />

                {/* Detailed Analytics Section */}
                <DetailedAnalytics
                    mealDistribution={data.analytics.mealDistribution}
                    expenseDistribution={data.analytics.expenseDistribution}
                    monthlyExpenses={data.analytics.monthlyExpenses}
                    mealRateTrend={data.analytics.mealRateTrend}
                    roomStats={data.analytics.roomStats}
                />
            </div>
        </DashboardShell>
    );
}
