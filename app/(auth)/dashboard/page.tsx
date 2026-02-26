import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';

// Services
import { fetchDashboardSummary } from '@/lib/services/dashboard-service';

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
    const summaryData = await fetchDashboardSummary(session.user.id, activeGroupId);

    if (!summaryData) return <NoGroupState />;

    const { userRole, currentPeriod } = summaryData;

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
        >
            <div className="space-y-4 sm:space-y-2 w-full min-w-0 flex flex-col">
                {/* Overview Section - Loaded Instantly */}
                <DashboardOverview summaryData={summaryData} />

                {/* Activity Section - Streams in */}
                <Suspense fallback={<ActivitySkeleton />}>
                    <ActivityWrapper
                        userId={session.user.id}
                        groupId={activeGroupId}
                    />
                </Suspense>

                {/* Quick Actions Section - Static */}
                <DashboardQuickActions />

                {/* Detailed Analytics Section - Streams in */}
                <Suspense fallback={<AnalyticsSkeleton />}>
                    <AnalyticsWrapper
                        userId={session.user.id}
                        groupId={activeGroupId}
                    />
                </Suspense>
            </div>
        </Dashboard>
    );
}

function ActivitySkeleton() {
    return (
        <div className="space-y-4 sm:space-y-5 px-1 animate-pulse">
            <div className="h-6 w-40 bg-muted rounded" />
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
                <div className="lg:col-span-4 h-[300px] bg-muted rounded-xl" />
                <div className="lg:col-span-3 h-[300px] bg-muted rounded-xl" />
            </div>
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-4 sm:space-y-6 animate-pulse">
            <div className="h-7 w-48 bg-muted rounded" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                <div className="xl:col-span-2 h-[350px] bg-muted rounded-xl" />
                <div className="h-[350px] bg-muted rounded-xl" />
                <div className="h-[350px] bg-muted rounded-xl" />
                <div className="xl:col-span-2 h-[350px] bg-muted rounded-xl" />
            </div>
        </div>
    );
}
