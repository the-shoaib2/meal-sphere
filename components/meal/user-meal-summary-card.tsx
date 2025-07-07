import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import React from "react";

interface UserMealSummaryCardProps {
  userMealStats: any;
}

const UserMealSummaryCard: React.FC<UserMealSummaryCardProps> = ({ userMealStats }) => {
  if (!userMealStats) {
    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <span className="hidden sm:inline">Your Meal Summary</span>
            <span className="sm:hidden">Your Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8">
            <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No Active Period</p>
            <p className="text-sm text-muted-foreground">Meal statistics are only available during active periods</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { totals, byType } = userMealStats;
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-full">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <span className="hidden sm:inline">Your Meal Summary - {currentMonth}</span>
          <span className="sm:hidden">Your Summary</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {totals.total} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Total Meals */}
          <div className="text-center space-y-1 p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">📊</span>
              <span className="text-xs font-medium text-blue-700 hidden sm:inline">Total</span>
              <span className="text-xs font-medium text-blue-700 sm:hidden">T</span>
            </div>
            <div className="text-lg font-bold text-blue-800">{totals.total}</div>
            <div className="text-xs text-blue-600 hidden sm:block">
              {totals.regularMeals} + {totals.guestMeals}
            </div>
          </div>

          {/* Breakfast */}
          <div className="text-center space-y-1 p-2 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">🌅</span>
              <span className="text-xs font-medium text-orange-700 hidden sm:inline">Breakfast</span>
              <span className="text-xs font-medium text-orange-700 sm:hidden">B</span>
            </div>
            <div className="text-lg font-bold text-orange-800">{byType.breakfast.total}</div>
            <div className="text-xs text-orange-600 hidden sm:block">
              {byType.breakfast.regular} + {byType.breakfast.guest}
            </div>
          </div>

          {/* Lunch */}
          <div className="text-center space-y-1 p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">☀️</span>
              <span className="text-xs font-medium text-yellow-700 hidden sm:inline">Lunch</span>
              <span className="text-xs font-medium text-yellow-700 sm:hidden">L</span>
            </div>
            <div className="text-lg font-bold text-yellow-800">{byType.lunch.total}</div>
            <div className="text-xs text-yellow-600 hidden sm:block">
              {byType.lunch.regular} + {byType.lunch.guest}
            </div>
          </div>

          {/* Dinner */}
          <div className="text-center space-y-1 p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">🌙</span>
              <span className="text-xs font-medium text-blue-700 hidden sm:inline">Dinner</span>
              <span className="text-xs font-medium text-blue-700 sm:hidden">D</span>
            </div>
            <div className="text-lg font-bold text-blue-800">{byType.dinner.total}</div>
            <div className="text-xs text-blue-600 hidden sm:block">
              {byType.dinner.regular} + {byType.dinner.guest}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserMealSummaryCard; 