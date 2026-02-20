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
import { PeriodArchiveDialog } from '@/components/periods/period-archive-dialog';
import { RestartPeriodDialog } from '@/components/periods/restart-period-dialog';
import { PeriodReportsSection } from '@/components/periods/period-reports-section';
import { PeriodOverviewSection } from '@/components/periods/period-overview-section';
import { useSession } from 'next-auth/react';
import { LoadingWrapper, Loader } from '@/components/ui/loader';
import { ArrowLeft, Lock, Unlock, Archive, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PeriodStatusCard } from '@/components/periods/period-status-card';
import { useGroupAccess } from '@/hooks/use-group-access';

interface PeriodDetailsProps {
    initialData?: any;
}

export function PeriodDetails({ initialData }: PeriodDetailsProps) {
    const router = useRouter();
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
        selectedPeriodId,
        showEndDialog,
        setShowEndDialog,
        showArchiveDialog,
        setShowArchiveDialog,
        handleEndPeriod,
        handleLockPeriod,
        handleUnlockPeriod,
        handleArchivePeriod,
        handleRestartPeriod,
        restartPeriodMutation,
    } = usePeriodManagement(initialData);

    const { userRole } = useGroupAccess({
        groupId: activeGroup?.id || "",
        initialData: initialData?.initialAccessData
    });

    const isPrivileged = ["ADMIN", "MANAGER", "MODERATOR"].includes(userRole ?? "");

    const [showRestartDialog, setShowRestartDialog] = useState(false);
    const [periodToRestart, setPeriodToRestart] = useState<MealPeriod | null>(null);
    const [showUnlockDialog, setShowUnlockDialog] = useState(false);
    const [unlockTargetPeriod, setUnlockTargetPeriod] = useState<MealPeriod | null>(null);
    const [unlockToActive, setUnlockToActive] = useState(false); // Default to ENDED when unlocking from details (safer)
    const [unlockLoading, setUnlockLoading] = useState(false);

    // Combined loading state
    const isLoading = periodsLoading || selectedPeriodLoading || summaryLoading || !activeGroup;

    // Handler for unlock dialog confirm
    const handleUnlockDialogConfirm = async () => {
        if (!unlockTargetPeriod) return;
        setUnlockLoading(true);
        await handleUnlockPeriod(unlockTargetPeriod.id, unlockToActive ? 'ACTIVE' : 'ENDED');
        setShowUnlockDialog(false);
        setUnlockTargetPeriod(null);
        setUnlockLoading(false);
    };

    // Handle restart period with dialog closing
    const handleRestartPeriodWithDialog = async (periodId: string, newName?: string, withData?: boolean) => {
        try {
            await handleRestartPeriod(periodId, newName, withData);
            setShowRestartDialog(false);
            setPeriodToRestart(null);
        } catch (error) {
            console.error('Error restarting period:', error);
        }
    };



    if (!selectedPeriod) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <h2 className="text-xl font-semibold">Period not found</h2>
                <Button onClick={() => router.push('/periods')}>Back to Periods</Button>
            </div>
        )
    }

    return (
        <LoadingWrapper isLoading={isLoading} minHeight="70vh">
            <div className="space-y-6">
                {/* Header with Back Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/periods')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{selectedPeriod.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                Period Details & Reports
                            </p>
                        </div>
                    </div>

                    {isPrivileged && (
                        <div className="flex items-center gap-2">
                            {/* Actions for this specific period */}
                            {!selectedPeriod.isLocked && (
                                <Button variant="outline" size="sm" onClick={() => handleLockPeriod(selectedPeriod.id)}>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Lock
                                </Button>
                            )}
                            {selectedPeriod.isLocked && (
                                <Button variant="outline" size="sm" onClick={() => {
                                    setUnlockTargetPeriod(selectedPeriod);
                                    setUnlockToActive(false);
                                    setShowUnlockDialog(true);
                                }}>
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Unlock
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => {
                                setShowArchiveDialog(true);
                            }}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                            </Button>
                        </div>
                    )}
                </div>

                {/* Overview Cards for the SELECTED period */}
                <div className="w-full">
                    <PeriodOverviewSection
                        periods={periods}
                        currentPeriod={currentPeriod}
                        selectedPeriod={selectedPeriod}
                        periodSummary={periodSummary}
                        activeGroup={activeGroup}
                    />
                </div>

                {/* Reports Section */}
                <PeriodReportsSection groupName={activeGroup?.name ?? ''} />

                {/* Archive Dialog */}
                <PeriodArchiveDialog
                    open={showArchiveDialog}
                    onOpenChange={setShowArchiveDialog}
                    onConfirm={async (id) => {
                        await handleArchivePeriod(id);
                        router.push('/periods'); // Go back after archiving
                    }}
                    periodId={selectedPeriodId}
                    period={selectedPeriod}
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
        </LoadingWrapper>
    );
}
