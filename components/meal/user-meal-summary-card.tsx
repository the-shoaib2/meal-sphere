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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Total Meals */}
          <div className="text-center space-y-0.5 p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">📊</span>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Total</span>
            </div>
            <div className="text-lg font-bold text-blue-800">{totals.total}</div>
            <div className="text-[10px] text-blue-600/70 font-medium">
              {totals.regularMeals} Reg + {totals.guestMeals} Gst
            </div>
          </div>

          {/* Breakfast */}
          <div className="text-center space-y-0.5 p-2 bg-orange-50/50 border border-orange-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">🌅</span>
              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">Breakfast</span>
            </div>
            <div className="text-lg font-bold text-orange-800">{byType.breakfast.total}</div>
            <div className="text-[10px] text-orange-600/70 font-medium">
              {byType.breakfast.regular} + {byType.breakfast.guest}
            </div>
          </div>

          {/* Lunch */}
          <div className="text-center space-y-0.5 p-2 bg-yellow-50/50 border border-yellow-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">☀️</span>
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-tight">Lunch</span>
            </div>
            <div className="text-lg font-bold text-yellow-800">{byType.lunch.total}</div>
            <div className="text-[10px] text-yellow-600/70 font-medium">
              {byType.lunch.regular} + {byType.lunch.guest}
            </div>
          </div>

          {/* Dinner */}
          <div className="text-center space-y-0.5 p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">🌙</span>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Dinner</span>
            </div>
            <div className="text-lg font-bold text-blue-800">{byType.dinner.total}</div>
            <div className="text-[10px] text-blue-600/70 font-medium">
              {byType.dinner.regular} + {byType.dinner.guest}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserMealSummaryCard; 