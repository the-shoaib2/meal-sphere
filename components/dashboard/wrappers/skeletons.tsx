
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Settings, BarChart3, PieChart as PieChartIcon, TrendingUp, AreaChart, Users } from "lucide-react"
import { DashboardActivity } from "@/components/dashboard/dashboard-activity"
import DetailedAnalytics from "@/components/dashboard/detailed-analytics"

export function ActivitySkeleton() {
    return (
        <DashboardActivity
            activities={undefined}
            chartData={undefined}
        />
    );
}

export function AnalyticsSkeleton() {
    return (
        <DetailedAnalytics
            isLoading={true}
        />
    );
}
