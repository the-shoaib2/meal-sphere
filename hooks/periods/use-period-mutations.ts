import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { PeriodStatus, MealPeriod } from '@prisma/client';
import { 
  createPeriodAction, 
  endPeriodAction, 
  lockPeriodAction, 
  unlockPeriodAction, 
  archivePeriodAction, 
  restartPeriodAction,
  updatePeriodAction,
  deletePeriodAction
} from '@/lib/actions/period.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export interface CreatePeriodData {
  name: string;
  startDate: Date;
  endDate?: Date | null;
  openingBalance?: number;
  carryForward?: boolean;
  notes?: string;
}

/**
 * Hook for managing period-related mutations.
 */
export function usePeriodMutations(groupId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Start a new period
  const startPeriod = useMutation({
    mutationFn: async (data: CreatePeriodData) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await createPeriodAction(groupId, data);
      if (!result.success) throw new Error(result.message || 'Failed to start period');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CURRENT_PERIOD] });
      router.refresh();
      toast.success('Period started successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // End an active period
  const endPeriod = useMutation({
    mutationFn: async ({ periodId, endDate }: { periodId: string; endDate?: Date }) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await endPeriodAction(groupId, periodId, endDate);
      if (!result.success) throw new Error(result.message || 'Failed to end period');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CURRENT_PERIOD] });
      router.refresh();
      toast.success('Period ended successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Lock a period
  const lockPeriod = useMutation({
    mutationFn: async (periodId: string) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await lockPeriodAction(groupId, periodId);
      if (!result.success) throw new Error(result.message || 'Failed to lock period');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      toast.success('Period locked successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Unlock a period
  const unlockPeriod = useMutation({
    mutationFn: async ({ periodId, status }: { periodId: string, status: PeriodStatus }) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await unlockPeriodAction(groupId, periodId, status);
      if (!result.success) throw new Error(result.message || 'Failed to unlock period');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      toast.success('Period restored successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Archive a period
  const archivePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await archivePeriodAction(groupId, periodId);
      if (!result.success) throw new Error(result.message || 'Failed to archive period');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS, groupId, true] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS, groupId, false] });
      toast.success('Period archived successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Restart a period
  const restartPeriod = useMutation({
    mutationFn: async ({ periodId, newName, withData }: { periodId: string; newName?: string; withData?: boolean }) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await restartPeriodAction(groupId, periodId, newName, withData);
      if (!result.success) throw new Error(result.message || 'Failed to restart period');
      return result.period;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CURRENT_PERIOD] });
      router.refresh();
      toast.success('Period restarted successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update period details
  const updatePeriod = useMutation({
    mutationFn: async ({ periodId, data }: { periodId: string; data: Partial<MealPeriod> }) => {
      if (!groupId) throw new Error('No active group selected');
      
      // Map Prisma nulls back to undefined for the action input
      const preparedData: any = { ...data };
      if (preparedData.notes === null) preparedData.notes = undefined;

      const result = await updatePeriodAction(groupId, periodId, preparedData);
      if (!result.success || !result.period) throw new Error(result.message || 'Failed to update period');
      return result.period as MealPeriod;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.PERIOD_DETAILS, groupId, data.id], data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      toast.success('Period updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete a period
  const deletePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await deletePeriodAction(groupId, periodId);
      if (!result.success) throw new Error(result.message || 'Failed to delete period');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CURRENT_PERIOD] });
      toast.success('Period deleted successfully!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    startPeriod,
    endPeriod,
    lockPeriod,
    unlockPeriod,
    archivePeriod,
    restartPeriod,
    updatePeriod,
    deletePeriod,
  };
}
