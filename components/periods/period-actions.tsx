import React, { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, AlertTriangle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { EditPeriodDialog } from './edit-period-dialog';
import { MealPeriod } from '@prisma/client';
import { CreatePeriodData } from '@/hooks/use-periods';

interface PeriodActionsProps {
    period: MealPeriod;
    onUpdate: (periodId: string, data: Partial<CreatePeriodData>) => Promise<void>;
    onDelete: (periodId: string) => Promise<void>;
    isLocked?: boolean;
}

export function PeriodActions({
    period,
    onUpdate,
    onDelete,
    isLocked
}: PeriodActionsProps) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    const handleDelete = async () => {
        try {
            await onDelete(period.id);
        } catch (error) {
            console.error('Failed to delete period:', error);
        }
    };

    return (
        <>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteAlert(true)}
                        className="text-red-600 focus:text-red-600 hover:bg-red-50/10 hover:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Period
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditPeriodDialog
                period={period}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                onSubmit={(data) => onUpdate(period.id, data)}
            />

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertDialogTitle>Delete Period</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                            Are you sure you want to delete the period <strong>"{period.name}"</strong>? This will permanently delete all associated meals, shopping items, and financial records for this period. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Period
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
