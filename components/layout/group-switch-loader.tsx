"use client"

import { useActiveGroup } from "@/contexts/group-context"
import { Loader } from "@/components/ui/loader"

/**
 * Global loader that shows when switching between groups.
 * - Shows immediately when isSwitchingGroup becomes true
 * - Handles rapid successive switches (useTransition manages this automatically)
 * - Matches the same visual style as PageLoader (loading.tsx)
 * - Completely replaces children to prevent stale content from flashing
 */
export function GroupSwitchLoader({ children }: { children: React.ReactNode }) {
    const { isSwitchingGroup } = useActiveGroup()

    if (isSwitchingGroup) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 w-full min-h-[72vh]">
                <div className="relative">
                    <Loader size="lg" />
                </div>
            </div>
        )
    }

    return <>{children}</>
}
