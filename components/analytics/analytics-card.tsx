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
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
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