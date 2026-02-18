
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Settings, BarChart3, PieChart as PieChartIcon, TrendingUp, AreaChart, Users } from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"

export function ActivitySkeleton() {
    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Activity Overview</h2>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
                {/* Chart Section (MealChart) */}
                <div className="lg:col-span-4">
                    <Card className="h-[400px]">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <h3 className="text-base font-bold tracking-tight text-foreground">Monthly Meal Summary</h3>
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
                            <h3 className="text-base font-bold tracking-tight">Recent Activities</h3>
                            <p className="text-xs text-muted-foreground/60">Your group&apos;s latest updates</p>
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
    );
}

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Premium Analytics</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <AnalyticsCard title="Daily Performance" icon={PieChartIcon} isLoading={true} description="Combined view.">
                        <Skeleton className="h-[250px] w-full" />
                    </AnalyticsCard>
                </div>
                <AnalyticsCard title="Meal Patterns" icon={PieChartIcon} isLoading={true} description="Comparative analysis.">
                    <Skeleton className="h-[250px] w-full" />
                </AnalyticsCard>
                <AnalyticsCard title="Expense Breakdown" icon={PieChartIcon} isLoading={true} description="Breakdown of expenses.">
                    <Skeleton className="h-[250px] w-full" />
                </AnalyticsCard>
                <div className="xl:col-span-2">
                    <AnalyticsCard title="Meal Rate Forecast" icon={TrendingUp} isLoading={true} description="Estimated trend.">
                        <Skeleton className="h-[250px] w-full" />
                    </AnalyticsCard>
                </div>
                {/* Optional Room Stats placeholder */}
                <div className="xl:col-span-3">
                    <AnalyticsCard title="Detailed Room Statistics" icon={Users} isLoading={true} description="Room stats.">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </AnalyticsCard>
                </div>
            </div>
        </div>
    );
}
