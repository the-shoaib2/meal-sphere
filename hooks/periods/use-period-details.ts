import { useQuery } from '@tanstack/react-query';
import { MealPeriod, PeriodStatus } from '@prisma/client';
import { getPeriodAction, getPeriodSummaryAction, getPeriodsAction } from '@/lib/actions/period.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export interface PeriodSummary {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  status: PeriodStatus;
  isLocked: boolean;
  totalMeals: number;
  totalGuestMeals: number;
  totalShoppingAmount: number;
  totalPayments: number;
  totalExtraExpenses: number;
  memberCount: number;
  activeMemberCount: number;
  openingBalance: number;
  closingBalance: number | null;
  carryForward: boolean;
}

/**
 * Hook for fetching details of a specific meal period.
 */
export function usePeriodDetails(groupId?: string, periodId?: string, initialData?: MealPeriod) {
  return useQuery<MealPeriod | null, Error>({
    queryKey: [QUERY_KEYS.PERIOD_DETAILS, groupId, periodId],
    queryFn: async () => {
      if (!groupId || !periodId) return null;
      try {
        const result = await getPeriodAction(groupId, periodId);
        if (!result.success) {
          if (result.message === 'Period not found' || result.message?.includes('Access denied')) {
            return null;
          }
          throw new Error(result.message || 'Failed to fetch period');
        }
        return (result.period as MealPeriod) || null;
      } catch (error) {
        console.warn('Error fetching period:', error);
        return null;
      }
    },
    enabled: !!groupId && !!periodId,
    initialData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook for fetching the current active period for a group.
 */
export function useCurrentPeriod(groupId?: string, initialData?: MealPeriod | null) {
  return useQuery<MealPeriod | null, Error>({
    queryKey: [QUERY_KEYS.CURRENT_PERIOD, groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const result = await getPeriodsAction(groupId, false);
      if (!result.success) throw new Error(result.message || 'Failed to fetch periods');
      
      const periods = (result.periods as MealPeriod[]) || [];
      return periods.find(p => p.status === 'ACTIVE') || null;
    },
    enabled: !!groupId,
    initialData,
    staleTime: 30000,
  });
}

/**
 * Hook for fetching summary statistics for a meal period.
 */
export function usePeriodSummary(groupId?: string, periodId?: string, initialData?: PeriodSummary) {
  return useQuery<PeriodSummary | null, Error>({
    queryKey: ['period-summary', groupId, periodId],
    queryFn: async () => {
      if (!groupId || !periodId) return null;
      const result = await getPeriodSummaryAction(groupId, periodId);
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch period summary');
      }
      return (result.summary as PeriodSummary) || null;
    },
    enabled: !!groupId && !!periodId,
    initialData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
