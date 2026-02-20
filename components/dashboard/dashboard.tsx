"use client";

import { ReactNode, useTransition, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { RefreshButton } from '@/components/dashboard/refresh-button';
import { DashboardActivity, DashboardChartData } from '@/types/dashboard';

// Context to share loading state with dashboard components
const DashboardLoadingContext = createContext<{ isLoading: boolean }>({ isLoading: false });

export const useDashboardLoading = () => useContext(DashboardLoadingContext);

interface DashboardProps {
    heading?: string;
    text?: string | ReactNode;
    children: ReactNode;
    activities?: DashboardActivity[];
    chartData?: DashboardChartData[];
}

/**
 * Dashboard - Wrapper component that manages dashboard refresh state
 * Note: Group switching loading is handled globally by GroupSwitchLoader in the auth layout.
 */
export function Dashboard({
    heading,
    text,
    children,
}: DashboardProps) {
    const router = useRouter();
    const [isRefreshing, startTransition] = useTransition();

    const refresh = () => {
        startTransition(() => {
            router.refresh();
        });
    };

    // Loading state for dashboard-specific refresh only
    const isLoading = isRefreshing;

    return (
        <DashboardLoadingContext.Provider value={{ isLoading }}>
            {heading && (
                <PageHeader heading={heading} text={text}>
                    <RefreshButton refresh={refresh} isRefreshing={isRefreshing} />
                </PageHeader>
            )}

            {/* Always render children, individual components will handle isLoading via useDashboardLoading */}
            <div className="relative">
                {children}
            </div>
        </DashboardLoadingContext.Provider>
    );
}
