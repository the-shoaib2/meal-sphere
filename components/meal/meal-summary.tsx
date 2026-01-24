import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils } from "lucide-react";
import React from "react";
import type { MealType } from "@/hooks/use-meal";

interface MealSummaryProps {
  selectedDate: Date;
  useMealCount: (date: Date, type: MealType) => number;
}

const MealSummary: React.FC<MealSummaryProps> = ({ selectedDate, useMealCount }) => {
  const breakfastCount = useMealCount(selectedDate, 'BREAKFAST');
  const lunchCount = useMealCount(selectedDate, 'LUNCH');
  const dinnerCount = useMealCount(selectedDate, 'DINNER');
  const totalMeals = breakfastCount + lunchCount + dinnerCount;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-full">
            <Utensils className="h-4 w-4 text-primary" />
          </div>
          Meal Summary
          <Badge variant="secondary" className="ml-auto text-xs">
            {totalMeals} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4 mt-2">
          <div className="text-center space-y-0.5 sm:space-y-1 p-1.5 sm:p-3 bg-orange-500/10 border-2 border-orange-500/40 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-base">🌅</span>
              <span className="text-[9px] sm:text-xs font-semibold text-orange-600 uppercase tracking-tighter sm:tracking-normal">Breakfast</span>
            </div>
            <div className="text-sm sm:text-xl font-bold text-orange-700">{breakfastCount}</div>
          </div>
          <div className="text-center space-y-0.5 sm:space-y-1 p-1.5 sm:p-3 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-base">☀️</span>
              <span className="text-[9px] sm:text-xs font-semibold text-yellow-600 uppercase tracking-tighter sm:tracking-normal">Lunch</span>
            </div>
            <div className="text-sm sm:text-xl font-bold text-yellow-700">{lunchCount}</div>
          </div>
          <div className="text-center space-y-0.5 sm:space-y-1 p-1.5 sm:p-3 bg-blue-500/10 border-2 border-blue-500/40 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-base">🌙</span>
              <span className="text-[9px] sm:text-xs font-semibold text-blue-600 uppercase tracking-tighter sm:tracking-normal">Dinner</span>
            </div>
            <div className="text-sm sm:text-xl font-bold text-blue-700">{dinnerCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealSummary; 