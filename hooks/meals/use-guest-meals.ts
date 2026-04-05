import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { fetchMealsData } from '@/lib/services/meals-service';
import { 
  addGuestMeal as patchGuestMealAction, 
  deleteGuestMeal as deleteGuestMealAction 
} from '@/lib/actions/meal.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { formatDateSafe } from '@/lib/utils/period-utils-shared';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export interface GuestMeal {
  id: string;
  date: string | Date;
  type: MealType;
  count: number;
  userId: string;
  roomId: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

const normalizeDateStr = (date: any): string => {
  if (!date) return '';
  return formatDateSafe(date);
};

/**
 * Hook for guest meals management.
 */
export function useGuestMeals(roomId?: string, selectedDate?: Date, currentPeriodId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const monthKey = selectedDate ? format(selectedDate, 'yyyy-MM') : null;

  const { data: guestMeals = [], isLoading, error } = useQuery<GuestMeal[], Error>({
    queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId, 'guest-meals', monthKey],
    queryFn: async () => {
      if (!roomId || !selectedDate) return [];
      const res = await fetchMealsData(session?.user?.id as string, roomId, { date: selectedDate });
      return (res.guestMeals || []) as GuestMeal[];
    },
    enabled: !!roomId && !!selectedDate,
    staleTime: 5 * 60 * 1000,
  });

  // Memoized indexing
  const guestMealsByDateIndex = useMemo(() => {
    const map: Record<string, GuestMeal[]> = {};
    guestMeals.forEach((meal) => {
      const dateStr = normalizeDateStr(meal.date);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(meal);
    });
    return map;
  }, [guestMeals]);

  const getGuestMealsByDate = useCallback((date: Date): GuestMeal[] => {
    const dateStr = formatDateSafe(date);
    return guestMealsByDateIndex[dateStr] || [];
  }, [guestMealsByDateIndex]);

  const getUserGuestMeals = useCallback((date: Date, userId?: string) => {
    const dateStr = formatDateSafe(date);
    const dayGuestMeals = guestMealsByDateIndex[dateStr] || [];
    const targetUserId = userId || session?.user?.id;
    return dayGuestMeals.filter((m) => m.userId === targetUserId);
  }, [guestMealsByDateIndex, session?.user?.id]);

  const getUserGuestMealCount = useCallback((date: Date, type: MealType, userId?: string) => {
    return getUserGuestMeals(date, userId)
      .filter((m) => m.type === type)
      .reduce((sum, m) => sum + m.count, 0);
  }, [getUserGuestMeals]);

  // Mutations
  const addGuestMeal = useMutation<GuestMeal, Error, { date: Date; type: MealType; count: number; isUpdate?: boolean }>({
    mutationFn: async ({ date, type, count, isUpdate }) => {
      const dateStr = formatDateSafe(date);
      const res = await patchGuestMealAction({ 
        roomId: roomId!, 
        userId: session?.user?.id as string, 
        dateStr, 
        type, 
        count, 
        periodId: currentPeriodId,
        isUpdate
      });
      if (!res.success) throw new Error(res.error || "Failed to patch guest meal");
      return res.data!;
    },
    onSuccess: (data) => {
      const targetMonthKey = format(new Date(data.date), 'yyyy-MM');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId, 'guest-meals', targetMonthKey] });
      toast.success('Guest meal updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteGuestMeal = useMutation<void, Error, { guestMealId: string; date: Date }>({
    mutationFn: async ({ guestMealId }) => {
      const res = await deleteGuestMealAction(guestMealId, session?.user?.id as string, currentPeriodId);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: (_, variables) => {
      const targetMonthKey = format(variables.date, 'yyyy-MM');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId, 'guest-meals', targetMonthKey] });
      toast.success('Guest meal deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    guestMeals,
    isLoading,
    error,
    getGuestMealsByDate,
    getUserGuestMeals,
    getUserGuestMealCount,
    addGuestMeal,
    deleteGuestMeal,
  };
}
