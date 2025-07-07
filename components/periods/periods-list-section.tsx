import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Calendar, Eye, MoreHorizontal, Lock, Unlock, RefreshCw, Archive, Plus } from 'lucide-react';
import { MealPeriod, PeriodStatus } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodsListSectionSkeleton } from './periods-skeleton';

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
  if (!activeGroup || !periods) {
    return <PeriodsListSectionSkeleton />;
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
                    {isPrivileged && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period: MealPeriod) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell>
                        {new Date(period.startDate).toLocaleDateString()} {period.endDate ? `- ${new Date(period.endDate).toLocaleDateString()}` : ''}
                      </TableCell>
                      <TableCell>
                        {period.isLocked ? (
                          <span className="text-red-600 font-semibold">Locked</span>
                        ) : (
                          <span className="text-green-600 font-semibold">{period.status}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activeGroup?.members?.length || 0} members
                      </TableCell>
                      {isPrivileged && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedPeriodId(period.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                {!period.isLocked && (
                                  <DropdownMenuItem onClick={() => handleLockPeriod(period.id)}>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Lock Period
                                  </DropdownMenuItem>
                                )}
                                {period.isLocked && (
                                  <DropdownMenuItem onClick={() => {
                                    setUnlockTargetPeriod(period);
                                    setUnlockToActive(period.status === 'ACTIVE');
                                    setShowUnlockDialog(true);
                                  }}>
                                    <Unlock className="h-4 w-4 mr-2" />
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
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-4">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                  </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 