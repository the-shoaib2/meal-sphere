'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Archive, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PeriodArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (periodId: string) => Promise<void>;
  periodId: string | null;
  period: any;
}

export function PeriodArchiveDialog({ open, onOpenChange, onConfirm, periodId, period }: PeriodArchiveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!periodId) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(periodId);
    } catch (error) {
      console.error('Error archiving period:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!period) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Archive className="h-5 w-5" />
            <span>Archive Period</span>
          </DialogTitle>
          <DialogDescription>
            This will archive the period "{period.name}". Archived periods are preserved for historical records but cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Archiving a period will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Move the period to archive status</li>
                <li>Preserve all data for historical records</li>
                <li>Remove it from active period lists</li>
                <li>Prevent any further modifications</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Period:</span>
              <span>{period.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Date Range:</span>
              <span>
                {format(new Date(period.startDate), 'MMM dd, yyyy')} - {format(new Date(period.endDate), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className="capitalize">{period.status.toLowerCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Members:</span>
              <span>{period.memberPeriods?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Locked:</span>
              <span>{period.isLocked ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Archiving...' : 'Archive Period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 