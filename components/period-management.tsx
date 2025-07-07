'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Plus, Lock, Unlock, Archive, Eye, Users, DollarSign, Utensils, AlertCircle, RefreshCw, MoreHorizontal } from 'lucide-react';
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
import { PeriodSummaryCard } from './periods/period-summary-card';
import { PeriodArchiveDialog } from './periods/period-archive-dialog';
import { RestartPeriodDialog } from './periods/restart-period-dialog';
import { PeriodManagementSkeleton } from './period-management-skeleton';
import { PeriodsListSection } from './periods/periods-list-section';
import { PeriodReportsSection } from './periods/period-reports-section';

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

  const [activeTab, setActiveTab] = useState('overview');
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [periodToRestart, setPeriodToRestart] = useState<MealPeriod | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockTargetPeriod, setUnlockTargetPeriod] = useState<MealPeriod | null>(null);
  const [unlockToActive, setUnlockToActive] = useState(true);
  const [unlockLoading, setUnlockLoading] = useState(false);

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

  // Show skeleton for all loading and no-group cases
  if (!activeGroup || !activeGroup.id || periodsLoading || currentPeriodLoading) {
    return <PeriodManagementSkeleton groupName={activeGroup?.name} />;
  }

  if (periodsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Period Management</h2>
            <p className="text-muted-foreground">
              Manage meal periods for {activeGroup.name}
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading periods: {periodsError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Period Management</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage meal periods for {activeGroup.name}
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <CreatePeriodDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSubmit={handleStartPeriod}
            disabled={!!currentPeriod}
          />
        </div>
      </div>

      {/* Current Period Status */}
      {currentPeriod && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Calendar className="h-5 w-5 sm:h-5 sm:w-5 text-green-600" />
              <span>Current Active Period</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {currentPeriod.name} • {format(new Date(currentPeriod.startDate), 'MMM dd, yyyy')}{currentPeriod.endDate ? ` - ${format(new Date(currentPeriod.endDate), 'MMM dd, yyyy')}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {activeGroup?.members?.length || 0} members
                  </span>
                </div>
                {getStatusBadge(currentPeriod.status, currentPeriod.isLocked)}
              </div>
              <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                <EndPeriodDialog
                  open={showEndDialog}
                  onOpenChange={setShowEndDialog}
                  onConfirm={handleEndPeriod}
                  period={currentPeriod}
                />
                {currentPeriod.isLocked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUnlockTargetPeriod(currentPeriod);
                      setUnlockToActive(currentPeriod.status === 'ACTIVE');
                      setShowUnlockDialog(true);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLockPeriod(currentPeriod.id)}
                    className="w-full sm:w-auto"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Lock
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Current Period State */}
      {!currentPeriod && periods && periods.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active period. All periods are either ended or archived. Create a new period to start tracking meals and expenses.
          </AlertDescription>
        </Alert>
      )}

      {/* No Periods State */}
      {!currentPeriod && periods && periods.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No periods created yet. Create your first period to start managing meals and expenses for {activeGroup.name}.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Section */}
      <div className="space-y-4">
        {/* Period Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Periods</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{periods?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {periods?.filter((p: MealPeriod) => p.status === PeriodStatus.ACTIVE).length || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Current Period Meals</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {currentPeriod ? (periodSummary?.totalMeals || 0) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentPeriod ? (periodSummary?.totalGuestMeals || 0) : 0} guest meals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Current Period Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                ${currentPeriod ? (periodSummary?.totalShoppingAmount || 0).toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                + ${currentPeriod ? (periodSummary?.totalExtraExpenses || 0).toFixed(2) : '0.00'} extra
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Current Period Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                ${currentPeriod ? (periodSummary?.totalPayments || 0).toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeGroup?.members?.length || 0} active members
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Selected Period Details */}
        {selectedPeriod && (
          <div className="grid gap-4 md:grid-cols-1">
            <PeriodSummaryCard period={selectedPeriod} summary={periodSummary ?? undefined} />
          </div>
        )}

        {/* No Period Selected State */}
        {!selectedPeriod && periods && periods.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Select a Period</h3>
                <p className="text-xs sm:text-muted-foreground">
                  Choose a period from the "All Periods" tab to view detailed information and member breakdowns.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
      />

      {/* Reports Section */}
      <PeriodReportsSection groupName={activeGroup.name} />

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
  );
} 