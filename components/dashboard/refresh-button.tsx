"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDashboardContext } from "@/contexts/dashboard-context";

export default function DashboardRefreshButton() {
    // Consume context instead of local state
    const { refresh, isRefreshing } = useDashboardContext();

    return (
        <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 sm:w-auto sm:h-8 lg:h-9 sm:px-3"
            onClick={refresh}
            disabled={isRefreshing}
            title={isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} sm:mr-1.5`} />
            <span className="hidden sm:inline">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
        </Button>
    );
}
