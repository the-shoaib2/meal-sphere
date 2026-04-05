import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { toggleMeal as toggleMealAction } from '@/lib/actions/meal.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { formatDateSafe } from '@/lib/utils/period-utils-shared';
import { Meal, MealType } from './use-meals';

interface ToggleMealInput {
  date: Date;
  type: MealType;
  userId: string;
  action: 'add' | 'remove';
  silent?: boolean;
}

/**
 * Hook for handling the toggleMeal mutation with optimized optimistic updates.
 */
export function useMealMutations(roomId?: string, currentPeriodId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const toggleMeal = useMutation({
    mutationFn: async ({ date, type, userId, action }: ToggleMealInput) => {
      const dateStr = formatDateSafe(date);
      const res = await toggleMealAction(roomId!, userId, dateStr, type, action, currentPeriodId);
      if (!res.success) {
        throw new Error(res.error || 'Failed to toggle meal');
      }
      return { meal: action === 'add' ? res.meal : null, success: true }; 
    },
    onMutate: async (variables) => {
      const { date, type, userId, action } = variables;
      const targetMonthKey = format(date, 'yyyy-MM');
      const queryKey = [QUERY_KEYS.MEALS_SYSTEM, roomId, targetMonthKey];

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<Meal[]>(queryKey);

      if (previousData) {
        queryClient.setQueryData<Meal[]>(queryKey, (old = []) => {
          if (action === 'remove') {
            return old.filter(m => !(formatDateSafe(m.date) === formatDateSafe(date) && m.type === type && m.userId === userId));
          } else {
            // Optimistic add (incomplete detail, but enough for UI)
            const tempMeal: any = {
              id: `temp-${Date.now()}`,
              date: date,
              type,
              userId,
              roomId: roomId!,
              user: userId === session?.user?.id ? session.user : { id: userId }
            };
            return [tempMeal, ...old];
          }
        });
      }

      return { previousData, queryKey };
    },
    onError: (error: any, variables, context: any) => {
      if (!variables.silent && context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
        toast.error(error.message || 'Failed to toggle meal');
      }
    },
    onSettled: (_, __, variables) => {
      const targetMonthKey = format(variables.date, 'yyyy-MM');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MEALS_SYSTEM, roomId, targetMonthKey] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_BALANCES, roomId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_BALANCE, roomId, session?.user?.id] });
    }
  });

  return {
    toggleMeal,
  };
}
