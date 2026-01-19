"use client";

import { ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardRefreshContext } from '@/contexts/dashboard-refresh-context';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

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
 */
export function DashboardShell({ header, children }: DashboardShellProps) {
    const router = useRouter();
    const [isRefreshing, startTransition] = useTransition();

    const refresh = () => {
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <DashboardRefreshContext.Provider value={{ refresh, isRefreshing }}>
            {/* Keep header visible during refresh */}
            {header}

            {/* Show skeleton during refresh, otherwise show actual content */}
            {isRefreshing ? (
                <div className="mt-4 sm:mt-6">
                    <DashboardSkeleton hideHeader={true} />
                </div>
            ) : (
                children
            )}
        </DashboardRefreshContext.Provider>
    );
}
