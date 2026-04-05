import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleMeal as toggleMealAction } from '@/lib/actions/meal.actions';
import { triggerAutoMeals as triggerAutoMealsAction } from '@/lib/actions/meal.actions';
import { toast } from 'sonner';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { MealSettings, AutoMealSettings } from './use-meal-settings';
import { formatDateSafe } from '@/lib/utils/period-utils-shared';

/**
 * Hook for handling the background logic of auto-triggering meals.
 */
export function useAutoMeal(
  roomId?: string, 
  mealSettings?: MealSettings | null, 
  autoMealSettings?: AutoMealSettings | null,
  currentPeriodId?: string
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const scheduledAutoMealsRef = useRef<Set<string>>(new Set());

  // Mutation for manual trigger
  const triggerAutoMeals = useMutation({
    mutationFn: async (date: Date) => {
      const dateStr = formatDateSafe(date);
      const res = await triggerAutoMealsAction(roomId!, dateStr);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success('Auto meals triggered');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId] });
    }
  });

  // Mutation for individual meal toggle (used by scheduler)
  const toggleMealMutation = useMutation({
    mutationFn: async ({ date, type, userId }: { date: Date; type: any; userId: string }) => {
      const dateStr = formatDateSafe(date);
      return await toggleMealAction(roomId!, userId, dateStr, type, 'add', currentPeriodId);
    }
  });

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !roomId || !mealSettings?.autoMealEnabled || !autoMealSettings?.isEnabled) return;

    const schedule = [
      { type: 'BREAKFAST', t: mealSettings.breakfastTime, e: autoMealSettings.breakfastEnabled },
      { type: 'LUNCH', t: mealSettings.lunchTime, e: autoMealSettings.lunchEnabled },
      { type: 'DINNER', t: mealSettings.dinnerTime, e: autoMealSettings.dinnerEnabled }
    ];

    const timers: NodeJS.Timeout[] = [];
    const today = format(new Date(), 'yyyy-MM-dd');

    schedule.forEach(({ type, t, e }) => {
      if (!e || !t || autoMealSettings.excludedMealTypes.includes(type as any) || autoMealSettings.excludedDates.includes(today)) return;

      const [h, m] = t.split(':').map(Number);
      const mealTime = new Date();
      mealTime.setHours(h, m, 0, 0);

      let ms = mealTime.getTime() - Date.now();
      
      // If it's more than 5 minutes ago or more than 24 hours away, skip
      if (ms < -300000 || ms > 86400000) return;
      
      // If it's current or just passed within 5 mins, trigger immediately
      if (ms < 0) ms = 0;

      const timer = setTimeout(() => {
        const id = `${today}-${type}`;
        if (scheduledAutoMealsRef.current.has(id)) return;
        
        scheduledAutoMealsRef.current.add(id);
        
        toggleMealMutation.mutate({ 
          date: new Date(), 
          type, 
          userId 
        }, {
          onError: () => scheduledAutoMealsRef.current.delete(id),
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId] });
          }
        });
      }, ms);

      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [session?.user?.id, roomId, mealSettings, autoMealSettings, toggleMealMutation, queryClient, currentPeriodId]);

  return {
    triggerAutoMeals,
  };
}
