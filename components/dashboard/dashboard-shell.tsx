"use client";

import { ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardRefreshContext } from '@/contexts/dashboard-refresh-context';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

interface DashboardShellProps {
    header: ReactNode;
    children: ReactNode;
}

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
            {header}
            {isRefreshing ? (
                /* 
                   We render the skeleton WITHOUT the header part, 
                   because the header is already rendered above.
                   However, DashboardSkeleton currently includes the header skeleton.
                   We should ideally update DashboardSkeleton to optionally hide header, 
                   or just accept that the skeleton will replace everything BELOW the header.
                   
                   The DashboardSkeleton has a "Header Skeleton" section.
                   If we render it here, we'll have a double header (real header + skeleton header).
                   
                   Quick fix: Wrap the skeleton in a div that hides the first child? No, unsafe.
                   Better: Use the CSS sibling selector or just render a modified skeleton?
                   Actually, let's just render the full skeleton for now and maybe visually it's fine 
                   if it replaces the content, BUT 'header' prop is rendered OUTSIDE the condition.

                   Wait, if I render 'header' (Active UI) AND 'DashboardSkeleton' (which has a header skeleton),
                   it will look weird.
                   
                   Correct approach: 
                   If 'isRefreshing', we want the user to see the LOADING STATE.
                   The loading state (DashboardSkeleton) typically has a skeleton header.
                   The LIVE state has a real header.
                   
                   If I keep the Real Header active and show Skeleton below, 
                   I should use a version of Skeleton without the header.
                   
                   Let's adjust this: 
                   The 'header' prop passed to Shell contains the Title and the BUTTON.
                   If I hide the header prop during refresh, the BUTTON disappears (or is replaced by skeleton).
                   The user clicked the button. It's nice if the button spins or indicates loading.
                   
                   If I replace everything with DashboardSkeleton, the Button is gone.
                   
                   Refined Plan:
                   Render the Real Header always.
                   Render the Skeleton (minus header) when refreshing.
                   
                   To do this cleanly, I'll add a wrapper div around the content of DashboardSkeleton 
                   and hide the header part via CSS or just duplicate the skeleton code without header here? 
                   Reuse is better. 
                   
                   Let's modify DashboardSkeleton to accept `withHeader` prop.
                */
                <div className="mt-4 sm:mt-6">
                    <DashboardSkeleton_NoHeader />
                </div>
            ) : (
                children
            )}
        </DashboardRefreshContext.Provider>
    );
}

// Helper to render skeleton without the top header part
// We can just import the parts, but DashboardSkeleton is one big block.
// Let's assume we will update DashboardSkeleton to accept a prop 'hideHeader'.
// For now, I will assume it's okay to render full skeleton or I will edit DashboardSkeleton next.
// I WILL EDIT DashboardSkeleton to accept hideHeader prop.

import { Skeleton } from "@/components/ui/skeleton" // Needed if I inline, but better to use the component.

// Reuse logic
function DashboardSkeleton_NoHeader() {
    // Actually, I'll just fix DashboardSkeleton in the next step.
    // For now, rendering DashboardSkeleton with a prop.
    return <DashboardSkeleton hideHeader={true} />
}
