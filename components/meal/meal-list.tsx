import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Utensils, Minus } from "lucide-react";
import type { MealType } from "@/hooks/use-meal";

interface MealWithUser {
  id: string;
  date: string;
  type: MealType;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  count?: number;
}

interface MealListProps {
  mealsForDate: MealWithUser[];
  guestMealsForDate: any[];
  session: any;
  isLoading: boolean;
  handleToggleMeal: (type: MealType) => void;
}

export default function MealList({ mealsForDate, guestMealsForDate, session, isLoading, handleToggleMeal }: MealListProps) {
  const allMeals = [...mealsForDate, ...guestMealsForDate];

  if (allMeals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Utensils className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium text-lg">No meals scheduled</p>
        <p className="text-sm text-muted-foreground">Add meals for this date to see them here</p>
      </div>
    );
  }

  // Group meals by type
  const mealsByType: Record<string, (MealWithUser | any)[]> = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
  };

  mealsForDate.forEach((meal) => {
    mealsByType[meal.type].push(meal);
  });

  guestMealsForDate.forEach((guestMeal) => {
    mealsByType[guestMeal.type].push(guestMeal);
  });

  return (
    <div className="space-y-6">
      {Object.entries(mealsByType).map(([type, typeMeals]) => {
        if (typeMeals.length === 0) return null;

        const mealTypeIcon = type === 'BREAKFAST' ? '🌅' : type === 'LUNCH' ? '☀️' : '🌙';
        const totalMeals = typeMeals.reduce((sum, meal) => sum + (meal.count || 1), 0);

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b">
              <span className="text-lg">{mealTypeIcon}</span>
              <h3 className="font-semibold text-base">{type.charAt(0) + type.slice(1).toLowerCase()}</h3>
              <Badge variant="secondary" className="ml-auto">
                {totalMeals} total
              </Badge>
            </div>

            <div className="space-y-2">
              {typeMeals.map((meal: any) => (
                <div key={meal.id} className="group flex items-center justify-between p-2.5 sm:p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                      <AvatarImage src={meal.user.image} alt={meal.user.name || undefined} />
                      <AvatarFallback className="text-[10px] sm:text-xs">
                        {meal.user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{meal.user.name}</p>
                      {meal.count && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {meal.count} guest meal{meal.count > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {meal.count && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs h-5 px-1.5">
                        ×{meal.count}
                      </Badge>
                    )}
                    {meal.userId === session?.user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-destructive/10 hover:text-destructive opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleToggleMeal(type as MealType)}
                        disabled={isLoading}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
} 