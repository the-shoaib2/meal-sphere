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
    Line
} from "recharts"
import { Users, TrendingUp, PieChart as PieChartIcon, AreaChart } from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"
import { RoomStatsTable } from "@/components/analytics/room-stats-table"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"];

export interface DetailedAnalyticsProps {
    roomStats: any[]; // Define strict type if available
    mealDistribution: { name: string; value: number }[];
    expenseDistribution: { name: string; value: number }[];
    monthlyExpenses: { name: string; value: number }[];
    mealRateTrend: { name: string; value: number }[];
}

export default function DetailedAnalytics({
    roomStats,
    mealDistribution,
    expenseDistribution,
    monthlyExpenses,
    mealRateTrend
}: DetailedAnalyticsProps) {

    if (!mealDistribution?.length && !expenseDistribution?.length) {
        return null;
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Detailed Analytics</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {/* Room Stats */}
                {/* Only show if we have data and it implies multiple rooms or interesting stats */}
                {roomStats && roomStats.length > 0 && (
                    <div className="xl:col-span-3">
                        <AnalyticsCard title="Room Statistics" icon={Users} isLoading={false} description="Key metrics for each room.">
                            <RoomStatsTable data={roomStats} />
                        </AnalyticsCard>
                    </div>
                )}

                <AnalyticsCard title="Meal Distribution" icon={PieChartIcon} isLoading={false} description="Breakdown of meals by type.">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={mealDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label
                            >
                                {mealDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </AnalyticsCard>

                <AnalyticsCard title="Expense Distribution" icon={PieChartIcon} isLoading={false} description="Breakdown of expenses by type.">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={expenseDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label
                            >
                                {expenseDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </AnalyticsCard>

                <AnalyticsCard title="Meal Rate Trend" icon={TrendingUp} isLoading={false} description="Meal rate fluctuations over time.">
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={mealRateTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" name="Meal Rate" />
                        </LineChart>
                    </ResponsiveContainer>
                </AnalyticsCard>

                <div className="xl:col-span-3">
                    <AnalyticsCard title="Monthly Expenses" icon={AreaChart} isLoading={false} description="Total expenses per month.">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={monthlyExpenses}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#82ca9d" name="Expenses" />
                            </BarChart>
                        </ResponsiveContainer>
                    </AnalyticsCard>
                </div>
            </div>
        </div>
    );
}
