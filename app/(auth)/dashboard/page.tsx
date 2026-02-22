import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';

// Services
import { fetchDashboardSummary } from '@/lib/services/dashboard-service';
import { fetchGroupAccessData } from '@/lib/services/groups-service';

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

    // 2. Fetch Initial Critical Data (Summary)
    // We await this to ensure the basic dashboard shell and summary are consistent
    // before streaming the heavy parts.
    const [summaryData, accessData] = await Promise.all([
        fetchDashboardSummary(session.user.id, activeGroupId),
        fetchGroupAccessData(activeGroupId, session.user.id)
    ]);

    // 3. Handle No Period State
    if (!summaryData?.currentPeriod) {
        const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
        return (
            <Dashboard heading="Dashboard" text="Overview of your group's meal activity and analytics.">
                <NoPeriodState
                    isPrivileged={isPrivileged}
                    periodMode={summaryData?.periodMode}
                    title="No Active Period"
                    description="Your dashboard is currently empty because there is no active meal period. Start a new period to see analytics, meal rates, and activity."
                />
            </Dashboard >
        );
    }

    // 4. Render UI with Streaming
    return (
        <Dashboard
            heading="Dashboard"
            text="Overview of your group's meal activity and analytics."
        // We no longer pass activities/chartData to the Shell if it doesn't use them directly (it passed them as children in original code? No, let's check Dashboard comopnent)
        >
            <div className="space-y-4 sm:space-y-2">
                {/* Overview Section - Loaded Instantly */}
                <DashboardOverview summaryData={summaryData} />

                {/* Activity Section - Loaded Instantly */}
                <ActivityWrapper
                    userId={session.user.id}
                    groupId={activeGroupId}
                />

                {/* Quick Actions Section - Static */}
                <DashboardQuickActions />

                {/* Detailed Analytics Section - Loaded Instantly */}
                <AnalyticsWrapper
                    userId={session.user.id}
                    groupId={activeGroupId}
                />
            </div>
        </Dashboard>
    );
}
