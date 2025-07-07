import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Calendar, Eye, MoreHorizontal, Lock, Unlock, RefreshCw, Archive, Plus } from 'lucide-react';
import { MealPeriod, PeriodStatus } from '@prisma/client';

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
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">All Periods</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            View and manage all meal periods for {activeGroup.name}
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
                    <TableHead>Actions</TableHead>
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
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPeriodId(period.id)}
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No Periods Created</h3>
                <p className="text-xs sm:text-muted-foreground mb-4">
                  Create your first period to start managing meals and expenses for {activeGroup.name}.
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Period
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 