"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
    refresh: () => void;
    isRefreshing: boolean;
}

export function RefreshButton({ refresh, isRefreshing }: RefreshButtonProps) {
    return (
        <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 sm:w-auto sm:h-8 lg:h-9 sm:px-3"
            onClick={refresh}
            disabled={isRefreshing}
            title={isRefreshing ? 'Refreshing...' : 'Refresh'}
        >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} sm:mr-1.5`} />
            <span className="hidden sm:inline">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
        </Button>
    );
}
