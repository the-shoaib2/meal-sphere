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
      className="h-8 w-8 flex items-center justify-center"
      onClick={refresh}
      disabled={isRefreshing}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>

  );
}
