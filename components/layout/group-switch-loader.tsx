"use client"

import { useActiveGroup } from "@/contexts/group-context"
import { Loader } from "@/components/ui/loader"

/**
 * Global overlay loader for group switching.
 * 
 * Uses OVERLAY approach — children stay mounted at all times.
 * This prevents conflicts with page-level loading.tsx Suspense boundaries
 * that would re-trigger if children were unmounted/remounted.
 * 
 * The overlay covers the content area with a semi-transparent background
 * and a centered spinner, matching the PageLoader visual style.
 */
export function GroupSwitchLoader({ children }: { children: React.ReactNode }) {
    const { isSwitchingGroup } = useActiveGroup()

    return (
        <div className="relative flex flex-col flex-1 min-h-0">
            {/* Children always stay mounted — no Suspense re-triggers */}
            {children}

            {/* Overlay: covers content with background + centered spinner */}
            {isSwitchingGroup && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center w-full min-h-[50vh] animate-in fade-in duration-500">
                    <div className="relative">
                        <Loader size="lg" />
                    </div>
                </div>
            )}
        </div>
    )
}
