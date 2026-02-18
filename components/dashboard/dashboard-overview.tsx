import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardSummaryCards from "@/components/dashboard/summary-cards";
import { DashboardSummary } from "@/types/dashboard";

interface DashboardOverviewProps {
    summaryData?: DashboardSummary;
    isLoading?: boolean;
}

export function DashboardOverview({ summaryData, isLoading }: DashboardOverviewProps) {
    return (
        <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <div>
                        <h2 className="text-base sm:text-lg font-bold tracking-tight">Overview</h2>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 rounded-full px-2 py-1">
                    <span className="relative flex h-2 w-2 mr-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                </Badge>
            </div>

            <DashboardSummaryCards
                totalMeals={summaryData?.totalUserMeals}
                currentRate={summaryData?.currentRate}
                myBalance={summaryData?.currentBalance}
                totalCost={summaryData?.totalCost}
                totalAllMeals={summaryData?.totalAllMeals}
                groupBalance={summaryData?.groupBalance}
                isLoading={isLoading}
            />
        </div>
    );
}
