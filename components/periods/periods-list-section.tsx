import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Eye, MoreHorizontal, Lock, Unlock, RefreshCw, Archive, List, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { MealPeriod, PeriodStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { EditPeriodDialog } from './edit-period-dialog';
import { useUpdatePeriod } from '@/hooks/use-periods';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export function PeriodsListSection({
  periods,
  activeGroup,
  setSelectedPeriodId,
  handleLockPeriod,
  handleUnlockPeriod,
  setUnlockTargetPeriod,
  setUnlockToActive,
  setShowUnlockDialog,
  setPeriodToRestart,
  setShowRestartDialog,
  setShowCreateDialog,
  setShowArchiveDialog,
  isPrivileged,
  includeArchived,
  setIncludeArchived,
  handleDeletePeriod,
  isLoading,
}: {
  periods: MealPeriod[];
  activeGroup: any;
  setSelectedPeriodId: (id: string) => void;
  handleLockPeriod: (id: string) => void;
  handleUnlockPeriod: (id: string, status: PeriodStatus) => void;
  setUnlockTargetPeriod: (period: MealPeriod) => void;
  setUnlockToActive: (active: boolean) => void;
  setShowUnlockDialog: (open: boolean) => void;
  setPeriodToRestart: (period: MealPeriod) => void;
  setShowRestartDialog: (open: boolean) => void;
  setShowCreateDialog: (open: boolean) => void;
  setShowArchiveDialog: (open: boolean) => void;
  isPrivileged: boolean;
  includeArchived: boolean;
  setIncludeArchived: (include: boolean) => void;
  handleDeletePeriod: (id: string) => Promise<void>;
  isLoading?: boolean;
}) {
  const router = useRouter();

  if (!activeGroup || !isPrivileged) {
    if (!isPrivileged) return null;
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">All Period History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage and view historical meal periods for {activeGroup.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Show Archived
              </span>
              <Switch
                checked={includeArchived}
                onCheckedChange={setIncludeArchived}
                className="scale-75 sm:scale-90"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-0 sm:px-6 relative min-h-[200px]">
          <div className="overflow-x-auto w-full">
            {isLoading || (periods && periods.length > 0) ? (
              <Table className="min-w-[700px] w-full text-xs sm:text-sm">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-bold text-muted-foreground h-11">Name</TableHead>
                    <TableHead className="font-bold text-muted-foreground h-11">Date Span</TableHead>
                    <TableHead className="font-bold text-muted-foreground h-11">Status</TableHead>
                    <TableHead className="font-bold text-muted-foreground h-11 text-center">Members</TableHead>
                    {isPrivileged && <TableHead className="font-bold text-muted-foreground h-11 text-right pr-6">Manage</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="relative">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isPrivileged ? 5 : 4} className="h-[200px] text-center">
                        <div className="flex items-center justify-center w-full h-full">
                          <Loader size="md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    periods?.map((period: MealPeriod) => (
                      <TableRow key={period.id} className="group hover:bg-muted/20 transition-colors border-border/50">
                        <TableCell className="font-semibold py-4">{period.name}</TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-foreground/90 font-medium">
                              {format(new Date(period.startDate), 'MMM d, yyyy')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              to {period.endDate ? format(new Date(period.endDate), 'MMM d, yyyy') : 'Ongoing'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {period.isLocked ? (
                              <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">
                                Locked
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={`
                                border-none font-medium
                                ${period.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' :
                                    period.status === 'ENDED' ? 'bg-amber-500/10 text-amber-600' :
                                      period.status === 'ARCHIVED' ? 'bg-slate-500/10 text-slate-500' :
                                        'bg-slate-500/10 text-slate-600'}
                              `}
                              >
                                {period.status}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/10">
                            {activeGroup?.members?.length || 0}
                          </span>
                        </TableCell>
                        {isPrivileged && (
                          <TableCell className="text-right py-4 pr-6">
                            <PeriodActions
                              period={period}
                              handleLockPeriod={handleLockPeriod}
                              setUnlockTargetPeriod={setUnlockTargetPeriod}
                              setUnlockToActive={setUnlockToActive}
                              setShowUnlockDialog={setShowUnlockDialog}
                              setPeriodToRestart={setPeriodToRestart}
                              setShowRestartDialog={setShowRestartDialog}
                              setSelectedPeriodId={setSelectedPeriodId}
                              setShowArchiveDialog={setShowArchiveDialog}
                              handleDeletePeriod={handleDeletePeriod}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
                <List className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-medium">No periods found in this group</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PeriodActions({
  period,
  handleLockPeriod,
  setUnlockTargetPeriod,
  setUnlockToActive,
  setShowUnlockDialog,
  setPeriodToRestart,
  setShowRestartDialog,
  setSelectedPeriodId,
  setShowArchiveDialog,
  handleDeletePeriod,
}: {
  period: MealPeriod;
  handleLockPeriod: (id: string) => void;
  setUnlockTargetPeriod: (period: MealPeriod) => void;
  setUnlockToActive: (active: boolean) => void;
  setShowUnlockDialog: (open: boolean) => void;
  setPeriodToRestart: (period: MealPeriod) => void;
  setShowRestartDialog: (open: boolean) => void;
  setSelectedPeriodId: (id: string) => void;
  setShowArchiveDialog: (open: boolean) => void;
  handleDeletePeriod: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutateAsync: updatePeriod } = useUpdatePeriod();

  const handleUpdate = async (periodId: string, data: any) => {
    await updatePeriod({ periodId, data });
  };

  const onConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await handleDeletePeriod(period.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete period:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" className="w-full sm:w-auto opacity-50 cursor-not-allowed">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full sm:w-auto">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Period
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/periods/${period.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>

        {period.status !== 'ARCHIVED' ? (
          <>
            {!period.isLocked && (
              <DropdownMenuItem onClick={() => handleLockPeriod(period.id)}>
                <Lock className="mr-2 h-4 w-4" />
                Lock Period
              </DropdownMenuItem>
            )}
            {period.isLocked && (
              <DropdownMenuItem onClick={() => {
                setUnlockTargetPeriod(period);
                setUnlockToActive(period.status === 'ACTIVE');
                setShowUnlockDialog(true);
              }}>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock Period
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setPeriodToRestart(period);
                setShowRestartDialog(true);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Period
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-red-600 focus:text-red-600 focus:bg-red-600/10 cursor-pointer'
              onClick={() => {
                setSelectedPeriodId(period.id);
                setShowArchiveDialog(true);
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Period
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className='text-amber-600 focus:text-amber-600 focus:bg-amber-600/10 cursor-pointer'
              onClick={() => {
                setUnlockTargetPeriod(period);
                setUnlockToActive(false); // Restore to ENDED state
                setShowUnlockDialog(true);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Period
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-red-600 focus:text-red-600 focus:bg-red-600/10 cursor-pointer'
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Period
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
      <EditPeriodDialog
        period={period}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={(data) => handleUpdate(period.id, data)}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Period
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the period <strong>"{period.name}"</strong>?
              This will remove all associated meals, shopping records, and financial data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                onConfirmDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
