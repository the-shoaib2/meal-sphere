"use client";

import { Skeleton } from "@/components/ui/skeleton"
import {
    ActivitySkeleton,
} from "@/components/dashboard/wrappers/skeletons"
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { BarChart3 } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { Badge } from "@/components/ui/badge"

interface DashboardSkeletonProps {
    hideHeader?: boolean;
}

export function DashboardSkeleton({ hideHeader = false }: DashboardSkeletonProps) {
    return (
        <div className="space-y-6 sm:space-y-8 pb-10">

            {/* Header - Show Actual Header instead of Skeleton */}
            {!hideHeader && (
                <PageHeader
                    heading="Dashboard"
                    text="Overview of your group's meal activity and analytics."
                >
                    <RefreshButton refresh={() => { }} isRefreshing={true} />
                </PageHeader>
            )}

            {/* Dashboard Overview - Includes Summary Cards */}
            <DashboardOverview isLoading={true} />

            {/* Activity Overview - Use Centralized Skeleton */}
            <ActivitySkeleton />

            {/* Quick Actions - Use Component Loading State */}
            <DashboardQuickActions />
        </div>
    )
}
