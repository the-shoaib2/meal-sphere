import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useActiveGroup } from '@/contexts/group-context';
import { usePeriodContext } from '@/contexts/period-context';
import { PeriodStatus } from '@prisma/client';

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
    error: null,
    refetch: async () => {},
  };
}

export function usePeriods(includeArchived = false, initialData?: PeriodsPageData) {
  const unified = usePeriodsPageData(includeArchived, initialData);
  return {
    ...unified,
    data: unified.data?.periods || [],
  };
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
    enabled: Boolean(activeGroup?.id && periodId && isCorrectGroup && !initialData),
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
    enabled: Boolean(targetGroupId && periodId && isCorrectGroup && !hasValidInitialData),
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
      const response = await fetch('/api/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          groupId: activeGroup.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
      router.refresh();
      toast.success('Period started successfully! 🎉', {
        description: 'All members have been notified about the new period.',
      });
    },
    onError: (error: Error) => {
      // Enhanced error handling with specific messages
      const errorMessage = error.message;

      if (errorMessage.includes('already an active period')) {
        toast.error('Cannot start new period', {
          description: 'There is already an active period. Please end the current period first before starting a new one.',
          action: {
            label: 'View Current Period',
            onClick: () => {
              // You could navigate to the current period view here
              console.log('Navigate to current period view');
            },
          },
        });
      } else if (errorMessage.includes('already exists in this group')) {
        toast.error('Duplicate period name', {
          description: 'A period with this name already exists. Please choose a different name.',
        });
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied', {
          description: 'Only admins and moderators can start new periods.',
        });
      } else if (errorMessage.includes('Start date must be before end date')) {
        toast.error('Invalid dates', {
          description: 'The start date must be before the end date.',
        });
      } else if (errorMessage.includes('overlap')) {
        toast.error('Date overlap detected', {
          description: 'The period dates overlap with an existing period. Each group can only have one period active at a time.',
        });
      } else {
        toast.error('Failed to start period', {
          description: errorMessage,
        });
      }
    },
  });
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
      const response = await fetch(`/api/periods/${periodId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'end',
          endDate: endDate?.toISOString(),
          groupId: activeGroup.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to end period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
      router.refresh();
      toast.success('Period ended successfully! 📊', {
        description: 'The period has been closed and calculations are ready for review.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;

      if (errorMessage.includes('No active period found') || errorMessage.includes('not active')) {
        // If it's already ended or not active, we can consider this a "success" state for the UI 
        // in terms of "we wanted it ended, and it is ended".
        // But let's verify by invalidating.
        queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
        
        toast.info('Period already ended', {
          description: 'This period appears to be already ended. The view has been updated.',
        });
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied', {
          description: 'Only admins and moderators can end periods.',
        });
      } else {
        toast.error('Failed to end period', {
          description: errorMessage,
        });
      }
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
      const response = await fetch(`/api/periods/${periodId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'lock',
          groupId: activeGroup.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lock period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
      router.refresh();
      toast.success('Period locked successfully! 🔒', {
        description: 'No further changes can be made to this period.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found', {
          description: 'The specified period could not be found.',
        });
      } else if (errorMessage.includes('already locked')) {
        toast.error('Period already locked', {
          description: 'This period is already locked.',
        });
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied', {
          description: 'Only admins and moderators can lock periods.',
        });
      } else {
        toast.error('Failed to lock period', {
          description: errorMessage,
        });
      }
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
      const response = await fetch(`/api/periods/${periodId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unlock',
          groupId: activeGroup.id,
          status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
      router.refresh();
      toast.success('Period unlocked successfully! 🔓', {
        description: 'Changes can now be made to this period.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found', {
          description: 'The specified period could not be found.',
        });
      } else if (errorMessage.includes('not locked')) {
        toast.error('Period not locked', {
          description: 'This period is not currently locked.',
        });
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied', {
          description: 'Only admins and moderators can unlock periods.',
        });
      } else {
        toast.error('Failed to unlock period', {
          description: errorMessage,
        });
      }
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
      const response = await fetch(`/api/periods/${periodId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'archive',
          groupId: activeGroup.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
      router.refresh();
      toast.success('Period archived successfully! 📦', {
        description: 'The period has been moved to archives for long-term storage.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found', {
          description: 'The specified period could not be found.',
        });
      } else if (errorMessage.includes('already archived')) {
        toast.error('Period already archived', {
          description: 'This period is already archived.',
        });
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied', {
          description: 'Only admins and moderators can archive periods.',
        });
      } else {
        toast.error('Failed to archive period', {
          description: errorMessage,
        });
      }
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

      const response = await fetch(`/api/periods/${periodId}/restart?groupId=${activeGroup.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName, withData }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to restart period';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods-overview'] });
      router.refresh();
      toast.success('Period restarted successfully! 🔄', {
        description: 'A new period has been created with the same settings.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;

      if (errorMessage.includes('Period not found')) {
        toast.error('Period not found', {
          description: 'The specified period could not be found.',
        });
      } else if (errorMessage.includes('already an active period')) {
        toast.error('Active period exists', {
          description: 'Please end the current active period before restarting another.',
        });
      } else if (errorMessage.includes('Insufficient permissions')) {
        toast.error('Permission denied', {
          description: 'Only admins and moderators can restart periods.',
        });
      } else {
        toast.error('Failed to restart period', {
          description: errorMessage,
        });
      }
    },
  });
}

export function usePeriodManagement(initialData?: PeriodsPageData) {
  const { activeGroup } = useActiveGroup();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    initialData?.currentPeriod?.id || null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const {
    data: periods,
    isLoading: periodsLoading,
    error: periodsError,
  } = usePeriods(false, initialData);

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

    // Error states
    periodsError,

    // Mutations
    startPeriodMutation,
    endPeriodMutation,
    lockPeriodMutation,
    unlockPeriodMutation,
    archivePeriodMutation,
    restartPeriodMutation,

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
  };
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
        const res = await fetch(`/api/groups/${activeGroup.id}/period-mode`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to update period mode');
        }
        return res.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['periods-overview', activeGroup?.id] });
        router.refresh();
        
        toast.success(`Period mode updated to ${data.periodMode}`, {
          description: data.periodMode === 'MONTHLY'
            ? 'Monthly periods will be created automatically'
            : 'You can now create custom periods manually',
        });
      },
      onError: (error: Error) => {
        toast.error('Failed to update period mode', {
          description: error.message,
        });
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
      const res = await fetch(`/api/groups/${groupId}/period-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update period mode');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['period-mode', groupId] });
      queryClient.invalidateQueries({ queryKey: ['periods-overview', groupId] });

      toast.success(`Period mode updated to ${data.periodMode}`, {
        description: data.periodMode === 'MONTHLY'
          ? 'Monthly periods will be created automatically'
          : 'You can now create custom periods manually',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update period mode', {
        description: error.message,
      });
    },
  });

  return {
    periodMode,
    isLoading,
    updatePeriodMode: updatePeriodMode.mutate,
    isUpdating: updatePeriodMode.isPending,
  };
} 