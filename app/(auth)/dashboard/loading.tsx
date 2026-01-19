import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
    BarChart3,
    Settings,
    Users,
    PieChart as PieChartIcon,
    TrendingUp,
    AreaChart
} from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"

export default function DashboardLoading() {
    return (
        <div className="space-y-4 sm:space-y-6">

            {/* Header Skeleton */}
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-8 w-32 sm:w-48" />
                <Skeleton className="h-8 w-24 sm:w-32 rounded-md" />
            </div>

            {/* Summary Cards Section */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 rounded-md" />
                    <Skeleton className="h-4 sm:h-5 w-16 sm:w-20 rounded-md" />
                </div>

                {/* Mirroring DashboardSummaryCards grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <Card key={`skeleton-card-${i}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-1" />
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Main Content Section - Activity Overview */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 rounded-md" />
                </div>

                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
                    {/* Chart Section (MealChart) */}
                    <div className="lg:col-span-4">
                        <Card className="h-[400px]">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5" />
                                    <Skeleton className="h-6 w-32" />
                                </div>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <Skeleton className="h-[300px] w-full" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activities (RecentActivities) */}
                    <div className="lg:col-span-3">
                        <Card className="h-[400px]">
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-56" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center">
                                            <Skeleton className="h-9 w-9 rounded-full mr-4" />
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-3 w-2/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 rounded-md" />
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={`quick-action-${i}`} className="group hover:shadow-md transition-all duration-200">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-full" />
                                    <div>
                                        <Skeleton className="h-4 sm:h-5 w-16 sm:w-24 mb-1" />
                                        <Skeleton className="h-3 sm:h-4 w-20 sm:w-32" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Detailed Analytics Skeleton */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 rounded-md" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    <AnalyticsCard title="Meal Distribution" icon={PieChartIcon} isLoading={true} description="Breakdown of meals by type.">
                        <Skeleton className="h-[250px] w-full" />
                    </AnalyticsCard>
                    <AnalyticsCard title="Expense Distribution" icon={PieChartIcon} isLoading={true} description="Breakdown of expenses by type.">
                        <Skeleton className="h-[250px] w-full" />
                    </AnalyticsCard>
                    <AnalyticsCard title="Meal Rate Trend" icon={TrendingUp} isLoading={true} description="Meal rate fluctuations over time.">
                        <Skeleton className="h-[250px] w-full" />
                    </AnalyticsCard>
                    <div className="xl:col-span-3">
                        <AnalyticsCard title="Monthly Expenses" icon={AreaChart} isLoading={true} description="Total expenses per month.">
                            <Skeleton className="h-[250px] w-full" />
                        </AnalyticsCard>
                    </div>
                </div>
            </div>
        </div>
    )
}
