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
      className="h-10 w-10 rounded-full flex items-center justify-center"
      onClick={refresh}
      disabled={isRefreshing}
    >
      <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>

  );
}
