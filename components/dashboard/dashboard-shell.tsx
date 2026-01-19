"use client";

import { ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardRefreshContext } from '@/contexts/dashboard-refresh-context';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { useActiveGroup } from '@/contexts/group-context';

interface DashboardShellProps {
    header: ReactNode;
    children: ReactNode;
}

/**
 * DashboardShell - Wrapper component that manages dashboard refresh state
 * 
 * Architecture:
 * - Server Component (page.tsx): Handles data fetching
 * - Client Component (this): Manages refresh interactivity
 * 
 * Benefits:
 * - Keeps header visible during refresh (better UX)
 * - Shows skeleton for content while re-fetching
 * - Provides refresh context to child components
 * - Detects group switching and shows skeleton during transition
 */
export function DashboardShell({ header, children }: DashboardShellProps) {
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
        <DashboardRefreshContext.Provider value={{ refresh, isRefreshing }}>
            {/* Keep header visible during refresh */}
            {header}

            {/* Show skeleton during refresh or group switch, otherwise show actual content */}
            {isLoading ? (
                <DashboardSkeleton hideHeader={true} />
            ) : (
                children
            )}
        </DashboardRefreshContext.Provider>
    );
}
