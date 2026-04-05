import { useState, useMemo } from 'react';
import { usePeriodsList } from './use-periods-list';
import { usePeriodDetails, useCurrentPeriod, usePeriodSummary } from './use-period-details';
import { usePeriodMutations } from './use-period-mutations';
import { useActiveGroup } from '@/contexts/group-context';

/**
 * Hook for managing the complete state and actions of the Period Management page.
 */
export function usePeriodManagement(initialData?: any) {
  const { activeGroup } = useActiveGroup();
  const groupId = activeGroup?.id;

  // State
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Queries
  const { 
    data: periods = [], 
    isLoading: periodsLoading, 
    error: periodsError 
  } = usePeriodsList(groupId, includeArchived, initialData?.periods);

  const { 
    data: currentPeriod, 
    isLoading: currentPeriodLoading 
  } = useCurrentPeriod(groupId, initialData?.currentPeriod);

  const { 
    data: selectedPeriod, 
    isLoading: selectedPeriodLoading 
  } = usePeriodDetails(groupId, selectedPeriodId || '');

  const { 
    data: periodSummary, 
    isLoading: summaryLoading 
  } = usePeriodSummary(groupId, selectedPeriodId || '', initialData);

  // Mutations
  const {
    startPeriod,
    endPeriod,
    lockPeriod,
    unlockPeriod,
    archivePeriod,
    restartPeriod,
    deletePeriod
  } = usePeriodMutations(groupId);

  const handleStartPeriod = async (data: any) => {
    await startPeriod.mutateAsync(data);
    setShowCreateDialog(false);
  };

  const handleEndPeriod = async () => {
    if (!currentPeriod?.id) return;
    await endPeriod.mutateAsync({ periodId: currentPeriod.id });
    setShowEndDialog(false);
  };

  const handleLockPeriod = async (periodId: string) => {
    await lockPeriod.mutateAsync(periodId);
  };

  const handleUnlockPeriod = async (periodId: string, status: 'ACTIVE' | 'ENDED') => {
    await unlockPeriod.mutateAsync({ periodId, status });
  };

  const handleArchivePeriod = async (periodId: string) => {
    await archivePeriod.mutateAsync(periodId);
    setShowArchiveDialog(false);
  };

  const handleRestartPeriod = async (periodId: string, newName?: string, withData?: boolean) => {
    await restartPeriod.mutateAsync({ periodId, newName, withData });
  };

  const handleDeletePeriod = async (periodId: string) => {
    await deletePeriod.mutateAsync(periodId);
  };

  return {
    activeGroup,
    periods,
    currentPeriod,
    selectedPeriod,
    periodSummary,
    periodsLoading,
    currentPeriodLoading,
    selectedPeriodLoading,
    summaryLoading,
    isLocking: lockPeriod.isPending,
    periodsError,
    selectedPeriodId,
    setSelectedPeriodId,
    showCreateDialog,
    setShowCreateDialog,
    showEndDialog,
    setShowEndDialog,
    showArchiveDialog,
    setShowArchiveDialog,
    handleStartPeriod,
    handleEndPeriod,
    handleLockPeriod,
    handleUnlockPeriod,
    handleArchivePeriod,
    handleRestartPeriod,
    handleDeletePeriod,
    restartPeriodMutation: restartPeriod,
    includeArchived,
    setIncludeArchived,
  };
}
