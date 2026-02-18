import { Skeleton } from "@/components/ui/skeleton"
import {
    ActivitySkeleton,
} from "@/components/dashboard/wrappers/skeletons"
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions"
import SummaryCards from "@/components/dashboard/summary-cards"
import { BarChart3 } from "lucide-react"

interface DashboardSkeletonProps {
    hideHeader?: boolean;
}

export function DashboardSkeleton({ hideHeader = false }: DashboardSkeletonProps) {
    return (
        <div className="space-y-6 sm:space-y-8 pb-10">

            {/* Header Skeleton */}
            {!hideHeader && (
                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-32 sm:w-48 rounded-xl" />
                        <Skeleton className="h-4 w-24 sm:w-32 rounded-md opacity-60" />
                    </div>
                    <Skeleton className="h-10 w-10 sm:h-12 sm:w-32 rounded-xl" />
                </div>
            )}

            {/* Summary Cards Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <BarChart3 className="h-4 w-4 text-primary/60" />
                    <Skeleton className="h-5 w-24 rounded-md" />
                </div>

                <SummaryCards isLoading={true} />
            </div>

            {/* Activity Overview - Use Centralized Skeleton */}
            <ActivitySkeleton />

            {/* Quick Actions - Use Component Loading State */}
            <DashboardQuickActions />
        </div>
    )
}
