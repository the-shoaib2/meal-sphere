"use client"

import {
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart,
    Bar
} from "recharts"
import { Users, PieChart as PieChartIcon, BarChart3, Activity } from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"
import { RoomStatsTable } from "@/components/analytics/room-stats-table"
import { DashboardChartData } from "@/types/dashboard"
import { useDashboardLoading } from "@/components/dashboard/dashboard"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export interface DetailedAnalyticsProps {
    roomStats?: any[];
    mealDistribution?: { name: string; value: number }[];
    expenseDistribution?: { name: string; value: number }[];
    monthlyExpenses?: { name: string; value: number }[];
    mealRateTrend?: { name: string; value: number }[];
    chartData?: DashboardChartData[];
    isLoading?: boolean;
}

export default function DetailedAnalytics({
    roomStats = [],
    mealDistribution = [],
    expenseDistribution = [],
    monthlyExpenses = [],
    mealRateTrend = [],
    chartData = [],
    isLoading: propIsLoading
}: DetailedAnalyticsProps) {
    const { isLoading: contextLoading } = useDashboardLoading();
    const isLoading = propIsLoading || contextLoading;

    // Always show the container, let individual cards handle empty states

    return (
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Premium Analytics</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {/* 1. Daily Performance (Composed Chart) - Now more prominent */}
                <div className="xl:col-span-2 lg:col-span-2 min-w-0">
                    <AnalyticsCard title="Daily Performance" icon={Activity} isLoading={isLoading} description="Combined view of meals and expenses over the last 30 days.">
                        {chartData && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
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
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                            backgroundColor: 'rgba(255,255,255,0.95)',
                                            backdropFilter: 'blur(4px)',
                                            padding: '12px'
                                        }}
                                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Area
                                        type="monotone"
                                        dataKey="meals"
                                        fill="url(#colorMeals)"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        name="Meals"
                                        animationDuration={1500}
                                        animationEasing="ease-in-out"
                                    />
                                    <Bar
                                        dataKey="expenses"
                                        fill="#10b981"
                                        barSize={12}
                                        radius={[4, 4, 0, 0]}
                                        name="Expenses"
                                        animationDuration={1500}
                                        animationEasing="ease-in-out"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                                <Activity className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No activity data for this period</p>
                            </div>
                        )}
                    </AnalyticsCard>
                </div>

                {/* 2. Expense Distribution (Pie Chart with Donut style) */}
                <AnalyticsCard title="Expense Breakdown" icon={PieChartIcon} isLoading={isLoading} description="Contribution of each expense category.">
                    {expenseDistribution && expenseDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={expenseDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    labelLine={false}
                                    paddingAngle={5}
                                >
                                    {expenseDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" align="center" layout="horizontal" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                            <PieChartIcon className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No expense breakdown data</p>
                        </div>
                    )}
                </AnalyticsCard>

                {/* 3. Room Statistics - Now in its own row below for full visibility */}
                {(isLoading || (roomStats && roomStats.length > 0)) && (
                    <div className="xl:col-span-3 lg:col-span-2 min-w-0">
                        <AnalyticsCard title="Room Performance Report" icon={Users} isLoading={isLoading} description="Comprehensive breakdown of performance metrics and activity stats.">
                            <RoomStatsTable data={roomStats} />
                        </AnalyticsCard>
                    </div>
                )}
            </div>
        </div>
    );
}
