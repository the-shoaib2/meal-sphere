import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';

// Services
import { fetchDashboardPageData } from '@/lib/services/dashboard-service';

// UI Components
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions';
import { Dashboard } from '@/components/dashboard/dashboard';
import { PageHeader } from '@/components/shared/page-header';

// Wrappers & Skeletons
import { ActivityWrapper } from '@/components/dashboard/wrappers/activity-wrapper';
import { AnalyticsWrapper } from '@/components/dashboard/wrappers/analytics-wrapper';

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
            <div className="space-y-2">
                <PageHeader
                    heading="Dashboard"
                    description="Welcome to MealSphere! Get started by creating or joining a group."
                />
                <NoGroupState />
            </div>
        );
    }

    // 2. Fetch All Dashboard Data in One Unified Cached Batch
    const dashboardData = await fetchDashboardPageData(session.user.id, activeGroupId);

    if (!dashboardData) return <NoGroupState />;

    const { summary: summaryData, userRole, currentPeriod } = dashboardData;

    // 3. Handle No Period State
    if (!currentPeriod) {
        const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(userRole || '');
        return (
                <NoPeriodState
                    isPrivileged={isPrivileged}
                    periodMode={summaryData?.periodMode}
                    title="No Active Period"
                    description="Your dashboard is currently empty because there is no active meal period. Start a new period to see analytics, meal rates, and activity."
                />
        );
    }

    // 4. Render UI with Streaming
    return (
        <Dashboard
            heading="Dashboard"
            description="Overview of your group's meal activity and analytics."
        // We no longer pass activities/chartData to the Shell if it doesn't use them directly (it passed them as children in original code? No, let's check Dashboard comopnent)
        >
            <div className="space-y-4 sm:space-y-2">
                {/* Overview Section - Loaded Instantly */}
                <DashboardOverview summaryData={summaryData} />

                {/* Activity Section - Reuses pre-fetched data */}
                <ActivityWrapper
                    data={dashboardData}
                />

                {/* Quick Actions Section - Static */}
                <DashboardQuickActions />

                {/* Detailed Analytics Section - Reuses pre-fetched data */}
                <AnalyticsWrapper
                    data={dashboardData}
                />
            </div>
        </Dashboard>
    );
}
