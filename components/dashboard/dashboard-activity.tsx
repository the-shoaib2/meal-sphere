import { Settings } from "lucide-react";
import MealChart from "@/components/dashboard/meal-chart";
import RecentActivities from "@/components/dashboard/recent-activities";
import { DashboardActivity as DashboardActivityType, DashboardChartData } from '@/types/dashboard';

interface DashboardActivityProps {
    activities: DashboardActivityType[] | undefined;
    chartData: DashboardChartData[] | undefined;
}

export function DashboardActivity({ activities, chartData }: DashboardActivityProps) {
    return (
        <div className="space-y-4 sm:space-y-5 px-1 w-full min-w-0">
            <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Activity Overview</h2>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
                <div className="lg:col-span-4 min-w-0">
                    <MealChart chartData={chartData} />
                </div>
                <div className="lg:col-span-3 min-w-0">
                    <RecentActivities activities={activities} />
                </div>
            </div>
        </div>
    );
}
