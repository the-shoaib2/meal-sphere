import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardSummaryCards from "@/components/dashboard/summary-cards";

interface DashboardOverviewProps {
    summaryData: {
        totalUserMeals: number;
        currentRate: number;
        currentBalance: number;
        totalCost: number;
        activeRooms: number;
        totalMembers: number;
        totalAllMeals: number;
        availableBalance: number;
        groupBalance: any;
    }
}

export function DashboardOverview({ summaryData }: DashboardOverviewProps) {
    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Overview</h2>
                <Badge variant="secondary" className="ml-2 text-xs">
                    Live
                </Badge>
            </div>

            <DashboardSummaryCards
                totalMeals={summaryData.totalUserMeals}
                currentRate={summaryData.currentRate}
                myBalance={summaryData.currentBalance}
                totalCost={summaryData.totalCost}
                activeRooms={summaryData.activeRooms}
                totalMembers={summaryData.totalMembers}
                totalAllMeals={summaryData.totalAllMeals}
                availableBalance={summaryData.availableBalance}
                groupBalance={summaryData.groupBalance}
            />
        </div>
    );
}
