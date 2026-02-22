import React from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { MealPeriod } from '@prisma/client';
import { PeriodActions } from './period-actions';
import { useUpdatePeriod, useDeletePeriod } from '@/hooks/use-periods';

interface PeriodHistoryCardProps {
    periods: MealPeriod[];
    activeGroup: any;
    isPrivileged: boolean;
}

export function PeriodHistoryCard({ periods, activeGroup, isPrivileged }: PeriodHistoryCardProps) {
    const { mutateAsync: updatePeriod } = useUpdatePeriod();
    const { mutateAsync: deletePeriod } = useDeletePeriod();

    const handleUpdate = async (periodId: string, data: any) => {
        await updatePeriod({ periodId, data });
    };

    const handleDelete = async (periodId: string) => {
        await deletePeriod(periodId);
    };

    return (
        <Card className="mt-4 w-full border-dashed">
            <CardHeader>
                <CardTitle className="text-base sm:text-lg">All Periods History</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Complete history of all meal periods for {activeGroup?.name || 'your group'}.
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
                                            ) : period.status === 'ENDED' ? (
                                                <span className="text-red-600 font-semibold">Ended</span>
                                            ) : (
                                                <span className="text-green-600 font-semibold">{period.status}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {activeGroup?.members?.length || 0} members
                                        </TableCell>
                                        {isPrivileged && (
                                            <TableCell>
                                                <PeriodActions
                                                    period={period}
                                                    onUpdate={handleUpdate}
                                                    onDelete={handleDelete}
                                                    isLocked={period.isLocked}
                                                />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No history found</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
