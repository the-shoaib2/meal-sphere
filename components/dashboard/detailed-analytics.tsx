"use client"

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts"
import { Users, BarChart3, Activity } from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"
import { RoomStatsTable } from "@/components/analytics/room-stats-table"
import { DashboardChartData } from "@/types/dashboard"
import { useDashboardLoading } from "@/components/dashboard/dashboard"

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

    return (
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Daily Performance</h2>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                {/* 1. Daily Performance (Line Chart) - Cleaner and more modern */}
                <div className="w-full min-w-0">
                    <AnalyticsCard title="Performance Trends" icon={Activity} isLoading={isLoading} description="Daily tracking of meal consumption and expenses.">
                        {chartData && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => new Date(str).getDate().toString()}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(8px)',
                                            padding: '16px'
                                        }}
                                    />
                                    <Legend 
                                        verticalAlign="top" 
                                        align="right" 
                                        height={50}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="meals"
                                        stroke="#3b82f6"
                                        strokeWidth={4}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="Meals"
                                        animationDuration={2000}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expenses"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="Expenses"
                                        animationDuration={2000}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-2xl border border-dashed">
                                <Activity className="h-10 w-10 mb-3 opacity-10" />
                                <p className="text-sm font-medium">No performance data available</p>
                            </div>
                        )}
                    </AnalyticsCard>
                </div>

                {/* 2. Room Statistics Table */}
                {(isLoading || (roomStats && roomStats.length > 0)) && (
                    <div className="w-full min-w-0">
                        <AnalyticsCard title="Room Performance Report" icon={Users} isLoading={isLoading} description="Detailed metrics across all members.">
                            <RoomStatsTable data={roomStats} />
                        </AnalyticsCard>
                    </div>
                )}
            </div>
        </div>
    );
}
