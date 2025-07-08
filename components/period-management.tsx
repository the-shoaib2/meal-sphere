'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Lock, Unlock, Archive, Eye, Users, AlertCircle, RefreshCw, MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePeriodManagement } from '@/hooks/use-periods';
import { PeriodStatus, MealPeriod } from '@prisma/client';
import { CreatePeriodDialog } from './periods/create-period-dialog';
import { EndPeriodDialog } from './periods/end-period-dialog';
import { PeriodArchiveDialog } from './periods/period-archive-dialog';
import { RestartPeriodDialog } from './periods/restart-period-dialog';
import { PeriodsListSection } from './periods/periods-list-section';
import { PeriodReportsSection } from './periods/period-reports-section';
import { PeriodOverviewSection } from './periods/period-overview-section';
import { useSession } from 'next-auth/react';
import { CurrentPeriodStatusCard } from './periods/current-period-status-card';
import { PeriodManagementSkeleton } from './periods/period-management-skeleton';

export function PeriodManagement() {
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
  } = usePeriodManagement();

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentMember = currentUserId ? activeGroup?.members?.find((m: any) => m.userId === currentUserId) : undefined;
  const isPrivileged = ["OWNER", "ADMIN", "MODERATOR"].includes(currentMember?.role ?? "");

  const [activeTab, setActiveTab] = useState('overview');
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [periodToRestart, setPeriodToRestart] = useState<MealPeriod | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockTargetPeriod, setUnlockTargetPeriod] = useState<MealPeriod | null>(null);
  const [unlockToActive, setUnlockToActive] = useState(true);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Combined loading state - show loader if any data is loading
  const isLoading = periodsLoading || currentPeriodLoading || selectedPeriodLoading || summaryLoading || !activeGroup;

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

  const getStatusBadge = (status: PeriodStatus, isLocked: boolean) => {
    if (isLocked) {
      return <Badge variant="destructive">Locked</Badge>;
    }
    
    switch (status) {
      case PeriodStatus.ACTIVE:
        return <Badge variant="default">Active</Badge>;
      case PeriodStatus.ENDED:
        return <Badge variant="secondary">Ended</Badge>;
      case PeriodStatus.ARCHIVED:
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
              <CreatePeriodDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={handleStartPeriod}
                disabled={!!currentPeriod}
              />
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