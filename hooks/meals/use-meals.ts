import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { fetchMealsData } from '@/lib/services/meals-service';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { formatDateSafe } from '@/lib/utils/period-utils-shared';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export interface Meal {
  id: string;
  date: string | Date;
  type: MealType;
  userId: string;
  roomId: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
  };
}

const normalizeDateStr = (date: any): string => {
  if (!date) return '';
  return formatDateSafe(date);
};

/**
 * Hook for fetching and indexing regular meals.
 */
export function useMeals(roomId?: string, selectedDate?: Date) {
  const { data: session } = useSession();
  const monthKey = selectedDate ? format(selectedDate, 'yyyy-MM') : null;

  const { data: meals = [], isLoading, error } = useQuery<Meal[], Error>({
    queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId, monthKey],
    queryFn: async () => {
      if (!roomId || !selectedDate) return [];
      const res = await fetchMealsData(session?.user?.id as string, roomId, { date: selectedDate });
      return (res.meals || []) as Meal[];
    },
    enabled: !!roomId && !!selectedDate,
    staleTime: 5 * 60 * 1000,
  });

  // Memoized indexing for O(1) lookups
  const mealsByDateIndex = useMemo(() => {
    const map: Record<string, Meal[]> = {};
    meals.forEach((meal) => {
      const dateStr = normalizeDateStr(meal.date);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(meal);
    });
    return map;
  }, [meals]);

  const getMealsByDate = (date: Date): Meal[] => {
    const dateStr = formatDateSafe(date);
    return mealsByDateIndex[dateStr] || [];
  };

  const hasMeal = (date: Date, type: MealType, userId?: string): boolean => {
    const dateStr = formatDateSafe(date);
    const targetUserId = userId || session?.user?.id;
    const dayMeals = mealsByDateIndex[dateStr] || [];
    return dayMeals.some((m) => m.type === type && m.userId === targetUserId);
  };

  return {
    meals,
    isLoading,
    error,
    getMealsByDate,
    hasMeal,
    mealsByDateIndex,
  };
}
