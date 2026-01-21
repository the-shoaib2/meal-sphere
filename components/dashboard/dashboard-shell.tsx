"use client";

import { ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardContext } from '@/contexts/dashboard-context';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { useActiveGroup } from '@/contexts/group-context';

// Types
import { DashboardActivity, DashboardChartData } from '@/types/dashboard';

interface DashboardShellProps {
    header: ReactNode;
    children: ReactNode;
    // Data props from server
    activities?: DashboardActivity[];
    chartData?: DashboardChartData[];
}

/**
 * DashboardShell - Wrapper component that manages dashboard refresh state
 *                  AND provides unified dashboard data context.
 */
export function DashboardShell({
    header,
    children,
    activities,
    chartData
}: DashboardShellProps) {
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
        <DashboardContext.Provider
            value={{
                // Data
                activities,
                chartData,

                // Status
                isLoading,
                error: null, // Basic error handling is done via error.tsx boundaries

                // Refresh Logic
                refresh,
                isRefreshing
            }}
        >
            {/* Keep header visible during refresh */}
            {header}

            {/* Show skeleton during refresh or group switch, otherwise show actual content */}
            {isLoading ? (
                <DashboardSkeleton hideHeader={true} />
            ) : (
                children
            )}
        </DashboardContext.Provider>
    );
}
