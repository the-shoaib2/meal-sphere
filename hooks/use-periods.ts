import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useActiveGroup } from '@/contexts/group-context';
import { usePeriodContext } from '@/contexts/period-context';
import { PeriodStatus } from '@prisma/client';
import { 
  createPeriodAction, 
  endPeriodAction, 
  lockPeriodAction, 
  unlockPeriodAction, 
  archivePeriodAction, 
  restartPeriodAction 
} from '@/lib/actions/period.actions';
export interface CreatePeriodData {
  name: string;
  startDate: Date;
  endDate?: Date | null;
  openingBalance?: number;
  carryForward?: boolean;
  notes?: string;
}

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

export interface MemberPeriodBreakdown {
  userId: string;
  userName: string;
  joinDate: Date;
  leaveDate: Date | null;
  mealCount: number;
  guestMealCount: number;
  shoppingAmount: number;
  paymentAmount: number;
  shareAmount: number;
  isActive: boolean;
}

export interface PeriodsPageData {
  periods: any[];
  currentPeriod: any;
  periodMode: 'MONTHLY' | 'CUSTOM';
  initialPeriodSummary?: PeriodSummary;
  groupId?: string;
  selectedPeriodId?: string;
}

export function usePeriodsPageData(includeArchived = false, initialData?: PeriodsPageData) {
  const { activeGroup } = useActiveGroup();
  const { periodsData } = usePeriodContext();
  
  // Priority: 1. Passed initialData, 2. Global context data
  const data = initialData || periodsData;

  // Strict check: Is the data we have actually for the group currently active in context?
  // If not, we are in a "refreshing" state after a group switch.
  const isDataStaleForGroup = Boolean(activeGroup?.id && data?.groupId && data.groupId !== activeGroup.id);

  return {
    data: isDataStaleForGroup ? null : data,
    isLoading: !!isDataStaleForGroup,
    isFetching: false,
    error: null,
    refetch: async () => {},
  };
}

export function usePeriods(includeArchived = false, initialData?: PeriodsPageData) {
  const { activeGroup } = useActiveGroup();
  const { periodsData } = usePeriodContext();
  
  // Base data source
  const contextData = initialData || periodsData;
  const isCorrectGroup = !!(contextData?.groupId && activeGroup?.id && contextData.groupId === activeGroup.id);
  const initialPeriods = isCorrectGroup ? contextData?.periods : undefined;

  const query = useQuery({
    queryKey: ['periods', activeGroup?.id, includeArchived],
    queryFn: async () => {
      if (!activeGroup?.id) return [];

      // If we don't need archived and we have context data for this group, use it
      if (!includeArchived && isCorrectGroup && initialPeriods) {
        return initialPeriods;
      }

      // Fetch from API
      const response = await fetch(`/api/periods?groupId=${activeGroup.id}&includeArchived=${includeArchived}`, { 
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch periods');
      }
      
      const data = await response.json();
      return data.periods || [];
    },
    enabled: !!activeGroup?.id,
    // Use initial data if available and we match the group + archive filter
    // Provide initialDataUpdatedAt so react-query knows when to trust optimistic updates vs initialData
    initialData: !includeArchived ? initialPeriods : undefined,
    initialDataUpdatedAt: !includeArchived && initialPeriods ? Date.now() : undefined,
    staleTime: includeArchived ? 0 : 30000, // Re-fetch archived immediately if requested
  });

  return { ...query, isFetching: query.isFetching };
}

export function useCurrentPeriod(initialData?: PeriodsPageData) {
  const unified = usePeriodsPageData(false, initialData);

  return {
    ...unified,
    data: unified.data?.currentPeriod || null,
  };
}

export function usePeriod(periodId: string) {
  const { activeGroup } = useActiveGroup();
  const { periodsData } = usePeriodContext();

  // Strict check: Only find initialData if group matches
  const isCorrectGroup = !!(periodsData?.groupId && activeGroup?.id && periodsData.groupId === activeGroup.id);
  const initialData = isCorrectGroup ? periodsData?.periods?.find((p: any) => p.id === periodId) : undefined;

  return useQuery({
    queryKey: ['period', periodId, activeGroup?.id],
    queryFn: async () => {
      // First try to find in the already loaded list of active periods from context
      if (isCorrectGroup && periodsData?.periods) {
        const found = periodsData.periods.find((p: any) => p.id === periodId);
        if (found) return found;
      }

      if (!activeGroup?.id || !periodId) {
        return null;
      }

      // Only fetch the specific period if not found in cache
      try {
        const response = await fetch(`/api/periods/${periodId}?groupId=${activeGroup.id}`, { cache: 'no-store' });
        if (!response.ok) {
          if (response.status === 404 || response.status === 403) {
            return null;
          }
          throw new Error('Failed to fetch period');
        }
        const responseData = await response.json();
        return responseData.period || null;
      } catch (error) {
        console.warn('Error fetching period:', error);
        return null;
      }
    },
    // DISABLE client-side fetch if we have initial data or we are during transition
    enabled: Boolean(activeGroup?.id && periodId),
    initialData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function usePeriodSummary(periodId: string, initialData?: any, groupId?: string) {
  const { activeGroup } = useActiveGroup();
  const { periodsData } = usePeriodContext();
  const targetGroupId = groupId || activeGroup?.id;

  // Strict check: Only find context summary if group matches target
  const isCorrectGroup = !!(periodsData?.groupId && targetGroupId && periodsData.groupId === targetGroupId);

  const contextSummary = isCorrectGroup && periodsData?.initialPeriodSummary && periodsData.initialPeriodSummary.id === periodId 
    ? periodsData.initialPeriodSummary 
    : undefined;
    
  const effectiveInitialData = initialData || contextSummary;
  const hasValidInitialData = !!effectiveInitialData;

  return useQuery({
    queryKey: ['periodSummary', periodId, targetGroupId],
    queryFn: async () => {
      if (!targetGroupId || !periodId) {
        return null;
      }
      const response = await fetch(`/api/periods/${periodId}/summary?groupId=${targetGroupId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch period summary');
      }
      const data = await response.json();
      return (data.summary as PeriodSummary) || null;
    },
    // Strictly disable fetching if we have initial data (Dashboard pattern)
    enabled: Boolean(targetGroupId && periodId),
    initialData: effectiveInitialData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function usePeriodsByMonth(year: number, month: number) {
  const { activeGroup } = useActiveGroup();

  return useQuery({
    queryKey: ['periodsByMonth', year, month, activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) {
        return [];
      }
      const response = await fetch(`/api/periods/by-month?groupId=${activeGroup.id}&year=${year}&month=${month}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch periods by month');
      }
      const data = await response.json();
      return data.periods;
    },
    enabled: !!activeGroup?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useStartPeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreatePeriodData) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }
      
      const result = await createPeriodAction(activeGroup.id, data);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to start period');
      }

      return result;
    },
    onMutate: async (data: CreatePeriodData) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      const optimisticPeriod = {
        id: `temp-${Date.now()}`,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate || null,
        status: 'ACTIVE',
        isLocked: false,
        groupId: activeGroup?.id,
        _count: {
          members: 0,
        },
      };

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return [optimisticPeriod];
        return [optimisticPeriod, ...old];
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return [optimisticPeriod];
        return [optimisticPeriod, ...old];
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period started successfully!');
    },
    onError: (error: Error, _, context) => {
      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }

      // Enhanced error handling with specific messages
      const errorMessage = error.message;

      if (errorMessage.includes('already an active period')) {
        toast.error('Active period exists. End the current one first.');
      } else if (errorMessage.includes('already exists in this group')) {
        toast.error('Period name already exists.');
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied.');
      } else if (errorMessage.includes('Start date must be before end date')) {
        toast.error('Start date must be before end date.');
      } else if (errorMessage.includes('overlap')) {
        toast.error('Date overlap detected.');
      } else {
        toast.error(`Start failed: ${errorMessage}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}



export function usePeriodMode(groupId?: string) {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  // Use simplified hook if no specific groupId passed (uses activeGroup context)
  const unified = usePeriodsPageData(false);

  // If we're just checking the current group, use the unified data
  if (!groupId || groupId === activeGroup?.id) {
    const updatePeriodMode = useMutation({
      mutationFn: async (mode: 'MONTHLY' | 'CUSTOM') => {
        if (!activeGroup?.id) throw new Error('No active group');
        
        const response = await fetch(`/api/groups/${activeGroup.id}/period-mode`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });

        if (!response.ok) {
           const result = await response.json();
           throw new Error(result.error || 'Failed to update period mode');
        }

        const data = await response.json();
        return data; 
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['periods-overview', activeGroup?.id] });
        router.refresh();
        
        // toast.success(`Period mode updated to ${data.periodMode}`);
      },
      onError: (error: Error) => {
        toast.error(`Update failed: ${error.message}`);
      },
    });

    return {
      periodMode: unified.data?.periodMode || 'MONTHLY',
      isLoading: unified.isLoading,
      updatePeriodMode: updatePeriodMode.mutate,
      isUpdating: updatePeriodMode.isPending,
    };
  }

  // Fallback to legacy individual fetch for other groups (rare case)
  const { data: periodMode = 'MONTHLY', isLoading } = useQuery<'MONTHLY' | 'CUSTOM'>({
    queryKey: ['period-mode', groupId],
    queryFn: async () => {
      if (!groupId) return 'MONTHLY';
      const res = await fetch(`/api/groups/${groupId}/period-mode`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch period mode');
      const data = await res.json();
      return data.periodMode || 'MONTHLY';
    },
    enabled: !!groupId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updatePeriodMode = useMutation({
    mutationFn: async (mode: 'MONTHLY' | 'CUSTOM') => {
      if (!groupId) throw new Error('No group ID');
      
      const response = await fetch(`/api/groups/${groupId}/period-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });

      if (!response.ok) {
         const result = await response.json();
         throw new Error(result.error || 'Failed to update period mode');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['period-mode', groupId] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview', groupId] });

      // toast.success(`Period mode updated to ${data.periodMode}`);
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
  
  return {
    periodMode,
    isLoading,
    updatePeriodMode: updatePeriodMode.mutate,
    isUpdating: updatePeriodMode.isPending,
  };
}

export function useEndPeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ periodId, endDate }: { periodId: string; endDate?: Date }) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }
      
      const result = await endPeriodAction(activeGroup.id, periodId, endDate);

      if (!result.success) {
         throw new Error(result.message || 'Failed to end period');
      }

      return result;
    },

    onMutate: async ({ periodId, endDate }) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, status: 'ENDED', endDate: endDate || new Date() } : p
        );
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, status: 'ENDED', endDate: endDate || new Date() } : p
        );
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period ended successfully!');
    },
    onError: (error: Error, _, context) => {
      const errorMessage = error.message;

      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }

      if (errorMessage.includes('No active period found') || errorMessage.includes('not active')) {
        queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
        queryClient.invalidateQueries({ queryKey: ['periods'] });
        toast.success('Period already ended');
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied.');
      } else {
        toast.error(`End failed: ${errorMessage}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function useLockPeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async (periodId: string) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }
      
      const result = await lockPeriodAction(activeGroup.id, periodId);

      if (!result.success) {
         throw new Error(result.message || 'Failed to lock period');
      }

      return result;
    },

    onMutate: async (periodId) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, isLocked: true, status: 'LOCKED' } : p
        );
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, isLocked: true, status: 'LOCKED' } : p
        );
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period locked successfully!');
    },
    onError: (error: Error, _, context) => {
      const errorMessage = error.message;

      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found');
      } else if (errorMessage.includes('already locked')) {
        toast.error('Period already locked');
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied.');
      } else {
        toast.error(`Lock failed: ${errorMessage}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function useUnlockPeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ periodId, status }: { periodId: string, status: PeriodStatus }) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }
      
      const result = await unlockPeriodAction(activeGroup.id, periodId, status);

      if (!result.success) {
         throw new Error(result.message || 'Failed to unlock period');
      }

      return result;
    },

    onMutate: async ({ periodId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, isLocked: false, status } : p
        );
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, isLocked: false, status } : p
        );
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period restored successfully!');
    },
    onError: (error: Error, _, context) => {
      const errorMessage = error.message;

      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found');
      } else if (errorMessage.includes('not locked')) {
        toast.error('Period not locked or archived');
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied.');
      } else {
        toast.error(`Unlock failed: ${errorMessage}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function useArchivePeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async (periodId: string) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }
      
      const result = await archivePeriodAction(activeGroup.id, periodId);

      if (!result.success) {
         throw new Error(result.message || 'Failed to archive period');
      }

      return result;
    },

    onMutate: async (periodId) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, status: 'ARCHIVED' } : p
        );
      });
      // Filter out archived periods from non-archived view optimistic update
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return old;
        return old.filter((p: any) => p.id !== periodId);
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period archived successfully!');
    },
    onError: (error: Error, _, context) => {
      const errorMessage = error.message;

      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found');
      } else if (errorMessage.includes('already archived')) {
        toast.error('Period already archived');
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied.');
      } else {
        toast.error(`Archive failed: ${errorMessage}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function useRestartPeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ periodId, newName, withData }: { periodId: string; newName?: string; withData?: boolean }) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const result = await restartPeriodAction(activeGroup.id, periodId, newName, withData);

      if (!result.success) {
         throw new Error(result.message || 'Failed to restart period');
      }

      return result.period;
    },

    onMutate: async ({ periodId, newName }) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      const optimisticPeriod = {
        id: `temp-${Date.now()}`,
        name: newName || 'Restarted Period...',
        startDate: new Date(),
        endDate: null,
        status: 'ACTIVE',
        isLocked: false,
        roomId: activeGroup?.id,
      };

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return [optimisticPeriod];
        return [optimisticPeriod, ...old];
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return [optimisticPeriod];
        return [optimisticPeriod, ...old];
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period restarted successfully!');
    },
    onError: (error: Error, _, context) => {
      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }

      const errorMessage = error.message;

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found');
      } else if (errorMessage.includes('already an active period')) {
        toast.error('Active period exists. End it first.');
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied.');
      } else {
        toast.error(`Restart failed: ${errorMessage}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function useUpdatePeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ periodId, data }: { periodId: string; data: Partial<CreatePeriodData> }) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const response = await fetch(`/api/periods/${periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          groupId: activeGroup.id,
          ...data
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update period');
      }

      return await response.json();
    },
    onMutate: async ({ periodId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, ...data } : p
        );
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.id === periodId ? { ...p, ...data } : p
        );
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period updated successfully!');
    },
    onError: (error: Error, _, context) => {
      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }
      toast.error(`Update failed: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function useDeletePeriod() {
  const queryClient = useQueryClient();
  const { activeGroup } = useActiveGroup();
  const router = useRouter();

  return useMutation({
    mutationFn: async (periodId: string) => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const response = await fetch(`/api/periods/${periodId}?groupId=${activeGroup.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete period');
      }

      return await response.json();
    },
    onMutate: async (periodId) => {
      await queryClient.cancelQueries({ queryKey: ['periods'] });
      await queryClient.cancelQueries({ queryKey: ['periods-overview'] });

      const previousPeriods = queryClient.getQueryData(['periods', activeGroup?.id, true]);
      const previousOverview = queryClient.getQueryData(['periods-overview', activeGroup?.id]);

      queryClient.setQueryData(['periods', activeGroup?.id, true], (old: any) => {
        if (!old) return old;
        return old.filter((p: any) => p.id !== periodId);
      });
      queryClient.setQueryData(['periods', activeGroup?.id, false], (old: any) => {
        if (!old) return old;
        return old.filter((p: any) => p.id !== periodId);
      });

      return { previousPeriods, previousOverview };
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Period deleted successfully!');
    },
    onError: (error: Error, _, context) => {
      if (context?.previousPeriods) {
        queryClient.setQueryData(['periods', activeGroup?.id, true], context.previousPeriods);
        queryClient.setQueryData(['periods', activeGroup?.id, false], context.previousPeriods);
      }
      if (context?.previousOverview) {
        queryClient.setQueryData(['periods-overview', activeGroup?.id], context.previousOverview);
      }
      toast.error(`Delete failed: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
    },
  });
}

export function usePeriodManagement(initialData?: PeriodsPageData, initialIncludeArchived = false) {
  const { activeGroup } = useActiveGroup();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    initialData?.selectedPeriodId || initialData?.currentPeriod?.id || null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived);

  const {
    data: periods,
    isLoading: isInitialLoading,
    isFetching: isFetchingPeriods,
    error: periodsError,
  } = usePeriods(includeArchived, initialData);

  const periodsLoading = isInitialLoading || isFetchingPeriods;

  const {
    data: currentPeriod,
    isLoading: currentPeriodLoading,
  } = useCurrentPeriod(initialData);

  // Auto-select current period if no period is selected, OR if active group changes
  useEffect(() => {
    if (activeGroup?.id) {
       // When group changes, default to current period or null
       setSelectedPeriodId(currentPeriod?.id || null);
    }
  }, [activeGroup?.id, currentPeriod]);
  
  // Ensure selectedPeriodId is valid (should belong to current group)
  useEffect(() => {
     if (selectedPeriodId && periods && !periods.find((p: any) => p.id === selectedPeriodId)) {
       // If selected period is not in the list of periods for this group, reset it
       setSelectedPeriodId(currentPeriod?.id || null);
     }
  }, [periods, selectedPeriodId, currentPeriod]);

  const {
    data: selectedPeriod,
    isLoading: selectedPeriodLoading,
  } = usePeriod(selectedPeriodId || '');

  const {
    data: periodSummary,
    isLoading: summaryLoading,
  } = usePeriodSummary(selectedPeriodId || '', initialData?.initialPeriodSummary);

  const startPeriodMutation = useStartPeriod();
  const endPeriodMutation = useEndPeriod();
  const lockPeriodMutation = useLockPeriod();
  const unlockPeriodMutation = useUnlockPeriod();
  const archivePeriodMutation = useArchivePeriod();
  const restartPeriodMutation = useRestartPeriod();
  const updatePeriodMutation = useUpdatePeriod();
  const deletePeriodMutation = useDeletePeriod();

  const handleStartPeriod = useCallback(async (data: CreatePeriodData) => {
    await startPeriodMutation.mutateAsync(data);
    setShowCreateDialog(false);
  }, [startPeriodMutation]);

  const handleEndPeriod = useCallback(async (endDate?: Date) => {
    if (!currentPeriod?.id) return;
    await endPeriodMutation.mutateAsync({ periodId: currentPeriod.id, endDate });
    setShowEndDialog(false);
  }, [currentPeriod?.id, endPeriodMutation]);

  const handleLockPeriod = useCallback(async (periodId: string) => {
    await lockPeriodMutation.mutateAsync(periodId);
  }, [lockPeriodMutation]);

  const handleUnlockPeriod = useCallback(async (periodId: string, status: PeriodStatus) => {
    await unlockPeriodMutation.mutateAsync({ periodId, status });
  }, [unlockPeriodMutation]);

  const handleArchivePeriod = useCallback(async (periodId: string) => {
    await archivePeriodMutation.mutateAsync(periodId);
    setShowArchiveDialog(false);
    setSelectedPeriodId(null);
  }, [archivePeriodMutation]);

  const handleRestartPeriod = useCallback(async (periodId: string, newName?: string, withData?: boolean) => {
    await restartPeriodMutation.mutateAsync({ periodId, newName, withData });
    // Note: Dialog closing will be handled by the parent component
  }, [restartPeriodMutation]);

  const handleUpdatePeriod = useCallback(async (periodId: string, data: Partial<CreatePeriodData>) => {
    await updatePeriodMutation.mutateAsync({ periodId, data });
  }, [updatePeriodMutation]);

  const handleDeletePeriod = useCallback(async (periodId: string) => {
    await deletePeriodMutation.mutateAsync(periodId);
  }, [deletePeriodMutation]);

  return {
    // Group context
    activeGroup,

    // Data
    periods,
    currentPeriod,
    selectedPeriod,
    periodSummary,

    // Loading states
    periodsLoading,
    currentPeriodLoading,
    selectedPeriodLoading,
    summaryLoading,
    isLocking: lockPeriodMutation.isPending,

    // Error states
    periodsError,

    // Mutations
    startPeriodMutation,
    endPeriodMutation,
    lockPeriodMutation,
    unlockPeriodMutation,
    archivePeriodMutation,
    restartPeriodMutation,
    updatePeriodMutation,
    deletePeriodMutation,

    // UI state
    selectedPeriodId,
    setSelectedPeriodId,
    showCreateDialog,
    setShowCreateDialog,
    showEndDialog,
    setShowEndDialog,
    showArchiveDialog,
    setShowArchiveDialog,

    // Handlers
    handleStartPeriod,
    handleEndPeriod,
    handleLockPeriod,
    handleUnlockPeriod,
    handleArchivePeriod,
    handleRestartPeriod,
    handleUpdatePeriod,
    handleDeletePeriod,

    // Archive visibility
    includeArchived,
    setIncludeArchived,
  };
}

 