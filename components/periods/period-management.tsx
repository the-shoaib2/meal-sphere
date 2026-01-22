'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { usePeriodManagement } from '@/hooks/use-periods';
// Use any for types if Prisma client is still generating
type PeriodStatus = any;
type MealPeriod = any;
import { CreatePeriodDialog } from '@/components/periods/create-period-dialog';
import { PeriodArchiveDialog } from '@/components/periods/period-archive-dialog';
import { RestartPeriodDialog } from '@/components/periods/restart-period-dialog';
import { PeriodsListSection } from '@/components/periods/periods-list-section';
import { PeriodReportsSection } from '@/components/periods/period-reports-section';
import { PeriodOverviewSection } from '@/components/periods/period-overview-section';
import { useSession } from 'next-auth/react';
import { CurrentPeriodStatusCard } from '@/components/periods/current-period-status-card';
import { PeriodManagementSkeleton } from '@/components/periods/period-management-skeleton';
import { usePeriodMode } from '@/hooks/use-periods';
import { Calendar, Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { useActiveGroup } from '@/contexts/group-context';
import { useGroupAccess } from '@/hooks/use-group-access';
import { PageHeader } from '@/components/shared/page-header';

// Define minimal type for initial data to avoid circular dependencies or strict type issues if not shared perfectly
interface PeriodManagementProps {
  initialData?: any;
}

export function PeriodManagement({ initialData }: PeriodManagementProps) {
  const {
    activeGroup,
    periods,
    currentPeriod,
    selectedPeriod,
    periodSummary,
    periodsLoading,
    currentPeriodLoading,
    selectedPeriodLoading,
    summaryLoading,
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
    restartPeriodMutation,
  } = usePeriodManagement(initialData);

  const { data: session } = useSession();
  const { groups: userGroups = [], isLoading: isLoadingGroups } = useActiveGroup();

  const { userRole, isLoading: isAccessLoading } = useGroupAccess({
    groupId: activeGroup?.id || "",
    initialData: initialData?.initialAccessData
  });

  const isPrivileged = ["ADMIN", "MANAGER", "MODERATOR"].includes(userRole ?? "");

  // Period mode management
  const { periodMode = 'MONTHLY', isLoading: periodModeLoading, updatePeriodMode, isUpdating } = usePeriodMode(activeGroup?.id);

  const [activeTab, setActiveTab] = useState('overview');
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [periodToRestart, setPeriodToRestart] = useState<MealPeriod | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockTargetPeriod, setUnlockTargetPeriod] = useState<MealPeriod | null>(null);
  const [unlockToActive, setUnlockToActive] = useState(true);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Combined loading state - show loader if any data is loading
  const isLoading = periodsLoading || currentPeriodLoading || selectedPeriodLoading || summaryLoading || !activeGroup;

  // Check if user has no groups - show empty state
  if (!isLoadingGroups && userGroups.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Period Management"
          text="Manage your periods and their statuses"
        />
        <NoGroupState />
      </div>
    );
  }

  // Handle period mode toggle
  const handlePeriodModeToggle = (checked: boolean) => {
    const newMode = checked ? 'MONTHLY' : 'CUSTOM';
    updatePeriodMode(newMode);
  };

  // Handle restart period with dialog closing
  const handleRestartPeriodWithDialog = async (periodId: string, newName?: string, withData?: boolean) => {
    try {
      await handleRestartPeriod(periodId, newName, withData);
      setShowRestartDialog(false);
      setPeriodToRestart(null);
    } catch (error) {
      console.error('Error restarting period:', error);
      // Dialog will stay open on error
    }
  };

  // Handler for unlock dialog confirm
  const handleUnlockDialogConfirm = async () => {
    if (!unlockTargetPeriod) return;
    setUnlockLoading(true);
    await handleUnlockPeriod(unlockTargetPeriod.id, unlockToActive ? 'ACTIVE' : 'ENDED');
    setShowUnlockDialog(false);
    setUnlockTargetPeriod(null);
    setUnlockLoading(false);
  };

  return (
    <>
      {isLoading ? (
        <PeriodManagementSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Period Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage your periods and their statuses.
              </p>
            </div>

            {isPrivileged && (
              <div className="flex items-center gap-3">
                <CreatePeriodDialog
                  open={showCreateDialog}
                  onOpenChange={setShowCreateDialog}
                  onSubmit={handleStartPeriod}
                  disabled={!!currentPeriod}
                  disabledReason={
                    currentPeriod
                      ? 'End the current period before starting a new one'
                      : undefined
                  }
                  periodMode={periodMode}
                  onPeriodModeToggle={handlePeriodModeToggle}
                  periodModeLoading={periodModeLoading}
                  isUpdatingMode={isUpdating}
                  currentPeriodExists={!!currentPeriod}
                />
              </div>
            )}
          </div>

          {/* Current Period Summary (should be first) */}
          <CurrentPeriodStatusCard
            currentPeriod={currentPeriod}
            activeGroup={activeGroup}
            isPrivileged={isPrivileged}
            showEndDialog={showEndDialog}
            setShowEndDialog={setShowEndDialog}
            handleEndPeriod={handleEndPeriod}
            setUnlockTargetPeriod={setUnlockTargetPeriod}
            setUnlockToActive={setUnlockToActive}
            setShowUnlockDialog={setShowUnlockDialog}
            handleLockPeriod={handleLockPeriod}
          />

          {/* Overview Cards */}
          <PeriodOverviewSection
            periods={periods}
            currentPeriod={currentPeriod}
            selectedPeriod={selectedPeriod}
            periodSummary={periodSummary}
            activeGroup={activeGroup}
          />

          {/* Periods List Section */}
          <PeriodsListSection
            periods={periods}
            activeGroup={activeGroup}
            setSelectedPeriodId={setSelectedPeriodId}
            handleLockPeriod={handleLockPeriod}
            handleUnlockPeriod={handleUnlockPeriod}
            setUnlockTargetPeriod={setUnlockTargetPeriod}
            setUnlockToActive={setUnlockToActive}
            setShowUnlockDialog={setShowUnlockDialog}
            setPeriodToRestart={setPeriodToRestart}
            setShowRestartDialog={setShowRestartDialog}
            setShowCreateDialog={setShowCreateDialog}
            setShowArchiveDialog={setShowArchiveDialog}
            isPrivileged={isPrivileged}
          />

          {/* Reports Section */}
          <PeriodReportsSection groupName={activeGroup?.name ?? ''} />

          {/* Archive Dialog */}
          <PeriodArchiveDialog
            open={showArchiveDialog}
            onOpenChange={setShowArchiveDialog}
            onConfirm={handleArchivePeriod}
            periodId={selectedPeriodId}
            period={selectedPeriod}
          />

          {/* Restart Dialog */}
          <RestartPeriodDialog
            open={showRestartDialog}
            onOpenChange={setShowRestartDialog}
            onConfirm={handleRestartPeriodWithDialog}
            period={periodToRestart}
            isLoading={restartPeriodMutation.isPending}
          />

          {/* Unlock Dialog */}
          <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Unlock Period</DialogTitle>
                <DialogDescription>
                  Choose the status for the period after unlocking.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between py-4">
                <span className="font-medium">Status:</span>
                <div className="flex items-center gap-2">
                  <span className={unlockToActive ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>Active</span>
                  <Switch checked={unlockToActive} onCheckedChange={setUnlockToActive} />
                  <span className={!unlockToActive ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}>Ended</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>Cancel</Button>
                <Button onClick={handleUnlockDialogConfirm} disabled={!unlockTargetPeriod || unlockLoading}>
                  {unlockLoading ? 'Unlocking...' : 'Unlock & Set Status'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}