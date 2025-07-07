import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils } from "lucide-react";

interface MealSummaryCardProps {
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  totalMeals: number;
}

const MealSummaryCard = ({ breakfastCount, lunchCount, dinnerCount, totalMeals }: MealSummaryCardProps) => (
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
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="text-center space-y-1 p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm sm:text-base">🌅</span>
            <span className="text-xs font-medium text-orange-700 hidden sm:inline">Breakfast</span>
            <span className="text-xs font-medium text-orange-700 sm:hidden">B</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-orange-800">{breakfastCount}</div>
        </div>
        <div className="text-center space-y-1 p-2 sm:p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-x border-border">
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm sm:text-base">☀️</span>
            <span className="text-xs font-medium text-yellow-700 hidden sm:inline">Lunch</span>
            <span className="text-xs font-medium text-yellow-700 sm:hidden">L</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-yellow-800">{lunchCount}</div>
        </div>
        <div className="text-center space-y-1 p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm sm:text-base">🌙</span>
            <span className="text-xs font-medium text-blue-700 hidden sm:inline">Dinner</span>
            <span className="text-xs font-medium text-blue-700 sm:hidden">D</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-blue-800">{dinnerCount}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default MealSummaryCard; 