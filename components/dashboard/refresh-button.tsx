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
      onClick={refresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 px-3"
    >
      <RefreshCw
        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
      />

      <span className="hidden sm:inline text-sm">
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </span>
    </Button>
  );
}