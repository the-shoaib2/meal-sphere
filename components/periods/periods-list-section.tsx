import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { PeriodHistoryCard } from '@/components/periods/period-history-card';
import { Eye, MoreHorizontal, Lock, Unlock, RefreshCw, Archive, List, ChevronUp, Edit } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { MealPeriod, PeriodStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { EditPeriodDialog } from './edit-period-dialog';
import { useUpdatePeriod } from '@/hooks/use-periods';


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
}) {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);

  if (!activeGroup || !periods || !isPrivileged) {
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
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">All Periods</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            View and manage all meal periods for {activeGroup?.name || 'your group'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            {periods && periods.length > 0 ? (
              <Table className="min-w-[600px] w-full text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    {isPrivileged && <TableHead >Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period: MealPeriod) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell>
                        {format(new Date(period.startDate), 'MMM d, yyyy')} {period.endDate ? `- ${format(new Date(period.endDate), 'MMM d, yyyy')}` : ''}
                      </TableCell>
                      <TableCell>
                        {period.isLocked ? (
                          <span className="text-red-600 font-semibold">Locked</span>
                        ) : (
                          <span className={`${period.status === 'ACTIVE' ? 'text-green-600' :
                            period.status === 'ENDED' ? 'text-yellow-600' :
                              period.status === 'ARCHIVED' ? 'text-gray-500' :
                                'text-gray-600'
                            } font-semibold`}>
                            {period.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activeGroup?.members?.length || 0} members
                      </TableCell>
                      {isPrivileged && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
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
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No periods found</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col items-center justify-center border-t pt-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto mb-4"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide Period History
                </>
              ) : (
                <>
                  <List className="mr-2 h-4 w-4" />
                  All Periods History
                </>
              )}
            </Button>

            {showHistory && (
              <PeriodHistoryCard
                periods={periods}
                activeGroup={activeGroup}
                isPrivileged={isPrivileged}
              />
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
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { mutateAsync: updatePeriod } = useUpdatePeriod();

  const handleUpdate = async (periodId: string, data: any) => {
    await updatePeriod({ periodId, data });
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
          onClick={() => {
            setSelectedPeriodId(period.id);
            setShowArchiveDialog(true);
          }}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Period
        </DropdownMenuItem>
      </DropdownMenuContent>
      <EditPeriodDialog
        period={period}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={(data) => handleUpdate(period.id, data)}
      />
    </DropdownMenu>
  );
}
