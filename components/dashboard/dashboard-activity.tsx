import { Settings } from "lucide-react";
import MealChart from "@/components/dashboard/meal-chart";
import RecentActivities from "@/components/dashboard/recent-activities";


export function DashboardActivity() {
    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold">Activity Overview</h2>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
                <div className="lg:col-span-4">
                    <MealChart />
                </div>
                <div className="lg:col-span-3">
                    <RecentActivities />
                </div>
            </div>
        </div>
    );
}
