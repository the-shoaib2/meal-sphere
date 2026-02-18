"use client"

import {
    PieChart,
    Pie,
    Cell,
    Bar,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ComposedChart,
    RadialBar,
    RadialBarChart
} from "recharts"
import { Users, TrendingUp, PieChart as PieChartIcon, AreaChart as AreaChartIcon, BarChart3, Target, Activity } from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"
import { RoomStatsTable } from "@/components/analytics/room-stats-table"
import { DashboardChartData } from "@/types/dashboard"
import { useDashboardLoading } from "@/components/dashboard/dashboard"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export interface DetailedAnalyticsProps {
    roomStats: any[];
    mealDistribution: { name: string; value: number }[];
    expenseDistribution: { name: string; value: number }[];
    monthlyExpenses: { name: string; value: number }[];
    mealRateTrend: { name: string; value: number }[];
    chartData?: DashboardChartData[];
}

export default function DetailedAnalytics({
    roomStats,
    mealDistribution,
    expenseDistribution,
    monthlyExpenses,
    mealRateTrend,
    chartData
}: DetailedAnalyticsProps) {
    const { isLoading } = useDashboardLoading();

    // Always show the container, let individual cards handle empty states

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Premium Analytics</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {/* 1. Daily Performance (Composed Chart) */}
                <div className="xl:col-span-2">
                    <AnalyticsCard title="Daily Performance" icon={Activity} isLoading={isLoading} description="Combined view of meals and expenses over the last 30 days.">
                        {chartData && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <ComposedChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => new Date(str).getDate().toString()}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Area type="monotone" dataKey="meals" fill="url(#colorMeals)" stroke="#3b82f6" name="Meals" />
                                    <Bar dataKey="expenses" fill="#10b981" barSize={10} radius={[4, 4, 0, 0]} name="Expenses" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                                <Activity className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No activity data for this period</p>
                            </div>
                        )}
                    </AnalyticsCard>
                </div>

                {/* 2. Meal Patterns (Radar Chart) */}
                <AnalyticsCard title="Meal Patterns" icon={Target} isLoading={isLoading} description="Comparative analysis of meal types.">
                    {mealDistribution && mealDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mealDistribution}>
                                <PolarGrid stroke="#f0f0f0" />
                                <PolarAngleAxis dataKey="name" />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                                <Radar
                                    name="Consumption"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    fill="#8b5cf6"
                                    fillOpacity={0.5}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                            <Target className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No meal pattern data</p>
                        </div>
                    )}
                </AnalyticsCard>

                {/* 3. Expense Distribution (Pie Chart with Donut style) */}
                <AnalyticsCard title="Expense Breakdown" icon={PieChartIcon} isLoading={isLoading} description="Contribution of each expense category.">
                    {expenseDistribution && expenseDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={expenseDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    labelLine={false}
                                >
                                    {expenseDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                            <PieChartIcon className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No expense breakdown data</p>
                        </div>
                    )}
                </AnalyticsCard>

                {/* 4. Meal Rate Trend (Area Chart) */}
                <div className="xl:col-span-2">
                    <AnalyticsCard title="Meal Rate Forecast" icon={TrendingUp} isLoading={isLoading} description="Estimated meal rate trend based on current data.">
                        {mealRateTrend && mealRateTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={mealRateTrend}>
                                    <defs>
                                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRate)" name="Rate (৳)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                                <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No meal rate trend data</p>
                            </div>
                        )}
                    </AnalyticsCard>
                </div>

                {/* 5. Room Statistics */}
                {roomStats && roomStats.length > 0 && (
                    <div className="xl:col-span-3">
                        <AnalyticsCard title="Detailed Room Statistics" icon={Users} isLoading={isLoading} description="Comprehensive breakdown of performance by room.">
                            <RoomStatsTable data={roomStats} />
                        </AnalyticsCard>
                    </div>
                )}
            </div>
        </div>
    );
}
