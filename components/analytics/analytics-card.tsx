import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { LucideIcon } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isLoading: boolean;
}

export function AnalyticsCard({ title, description, icon: Icon, children, isLoading }: AnalyticsCardProps) {
  return (
    <Card className="h-full min-w-0 flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary flex-shrink-0" />
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight truncate">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 min-w-0 flex flex-col">
        {isLoading ? (
          <div className="h-[300px] w-full bg-muted/40 rounded-xl animate-pulse flex items-center justify-center border border-dashed border-border">
            <Skeleton className="h-12 w-12 rounded-full opacity-20" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
} 