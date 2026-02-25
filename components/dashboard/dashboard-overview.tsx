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
                <div className="flex items-center gap-2 group cursor-default">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50/50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20">
                        Live Tracking
                    </Badge>
                </div>
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
