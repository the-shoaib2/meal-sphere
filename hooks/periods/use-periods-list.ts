import { useQuery } from '@tanstack/react-query';
import { MealPeriod } from '@prisma/client';
import { getPeriodsAction, getPeriodsByMonthAction } from '@/lib/actions/period.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/**
 * Hook for fetching lists of meal periods.
 */
export function usePeriodsList(groupId?: string, includeArchived = false, initialPeriods?: MealPeriod[]) {
  return useQuery<MealPeriod[], Error>({
    queryKey: [QUERY_KEYS.PERIODS, groupId, includeArchived],
    queryFn: async () => {
      if (!groupId) return [];
      
      const result = await getPeriodsAction(groupId, includeArchived);
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch periods');
      }
      
      return (result.periods as MealPeriod[]) || [];
    },
    enabled: !!groupId,
    initialData: initialPeriods,
    staleTime: includeArchived ? 0 : 30000,
  });
}

/**
 * Hook for fetching periods within a specific month.
 */
export function usePeriodsByMonth(groupId: string, year: number, month: number) {
  return useQuery<MealPeriod[], Error>({
    queryKey: ['periodsByMonth', year, month, groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const result = await getPeriodsByMonthAction(groupId, year, month);
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch periods by month');
      }
      return (result.periods as MealPeriod[]) || [];
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
