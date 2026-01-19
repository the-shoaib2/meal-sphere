"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDashboardRefresh } from "@/contexts/dashboard-refresh-context";

export default function DashboardRefreshButton() {
    // Consume context instead of local state
    const { refresh, isRefreshing } = useDashboardRefresh();

    return (
        <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm h-7 sm:h-8 lg:h-9 px-2 sm:px-3 w-full sm:w-auto"
            onClick={refresh}
            disabled={isRefreshing}
        >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
    );
}
