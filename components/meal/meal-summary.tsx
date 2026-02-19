import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils } from "lucide-react";
import React from "react";
import type { MealType } from "@/hooks/use-meal";
import { Skeleton } from "@/components/ui/skeleton";

interface MealSummaryProps {
  selectedDate: Date;
  useMealCount: (date: Date, type: MealType) => number;
  isLoading?: boolean;
}

const MEAL_TYPES = [
  { type: "BREAKFAST" as MealType, label: "Breakfast", icon: "🌅", color: "orange" },
  { type: "LUNCH" as MealType, label: "Lunch", icon: "☀️", color: "yellow" },
  { type: "DINNER" as MealType, label: "Dinner", icon: "🌙", color: "blue" },
] as const;

const COLOR_MAP = {
  orange: { bg: "bg-orange-500/10", text: "text-orange-600", bold: "text-orange-700", skeleton: "bg-orange-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-600", bold: "text-yellow-700", skeleton: "bg-yellow-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", bold: "text-blue-700", skeleton: "bg-blue-500/20" },
};

const MealSummary: React.FC<MealSummaryProps> = ({ selectedDate, useMealCount, isLoading }) => {
  const counts = MEAL_TYPES.map(m => ({ ...m, count: useMealCount(selectedDate, m.type) }));
  const total = counts.reduce((sum, m) => sum + m.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-full">
            <Utensils className="h-4 w-4 text-primary" />
          </div>
          Meal Summary
          <Badge variant="secondary" className="ml-auto text-xs">
            {isLoading ? <Skeleton className="h-4 w-8" /> : `${total} total`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
          {counts.map(({ type, label, icon, color, count }) => {
            const c = COLOR_MAP[color];
            return (
              <div key={type} className={`text-center space-y-0.5 sm:space-y-1 p-1.5 sm:p-3 rounded-lg ${c.bg}`}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
                  <span className="text-sm sm:text-base">{icon}</span>
                  <span className={`text-[9px] sm:text-xs font-semibold uppercase tracking-tighter sm:tracking-normal ${c.text}`}>
                    {label}
                  </span>
                </div>
                <div className={`text-sm sm:text-xl font-bold flex justify-center ${c.bold}`}>
                  {isLoading ? <Skeleton className={`h-6 w-8 ${c.skeleton}`} /> : count}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MealSummary;