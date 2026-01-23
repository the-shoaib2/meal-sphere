"use client";

import { ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { useActiveGroup } from '@/contexts/group-context';
import { PageHeader } from '@/components/shared/page-header';
import { RefreshButton } from '@/components/dashboard/refresh-button';
import { DashboardActivity, DashboardChartData } from '@/types/dashboard';

interface DashboardProps {
    heading?: string;
    text?: string | ReactNode;
    children: ReactNode;
    // Data props from server
    activities?: DashboardActivity[];
    chartData?: DashboardChartData[];
}

/**
 * Dashboard - Wrapper component that manages dashboard refresh state
 */
export function Dashboard({
    heading,
    text,
    children,
    activities,
    chartData
}: DashboardProps) {
    const router = useRouter();
    const [isRefreshing, startTransition] = useTransition();
    const { isSwitchingGroup } = useActiveGroup();

    const refresh = () => {
        startTransition(() => {
            router.refresh();
        });
    };

    // Show skeleton during either refresh button click or group switch
    const isLoading = isRefreshing || isSwitchingGroup;

    return (
        <>
            {heading && (
                <PageHeader heading={heading} text={text}>
                    <RefreshButton refresh={refresh} isRefreshing={isRefreshing} />
                </PageHeader>
            )}

            {/* Show skeleton during refresh or group switch, otherwise show actual content */}
            {isLoading ? (
                <DashboardSkeleton hideHeader={true} />
            ) : (
                children
            )}
        </>
    );
}
