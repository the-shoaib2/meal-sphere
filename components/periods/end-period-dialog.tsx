'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EndPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (endDate?: Date) => Promise<void>;
  period: any;
}

export function EndPeriodDialog({ open, onOpenChange, onConfirm, period }: EndPeriodDialogProps) {
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(endDate);
    } catch (error) {
      console.error('Error ending period:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" suppressHydrationWarning>
          End Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>End Current Period</DialogTitle>
          <DialogDescription>
            This will end the current active period "{period?.name}". All members will be notified and no further edits will be allowed unless the period is unlocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ending a period will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Mark all current members as inactive</li>
                <li>Prevent further meal and expense entries</li>
                <li>Send notifications to all members</li>
                <li>Allow you to start a new period</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Period:</strong> {period?.name}</p>
            <p><strong>Start Date:</strong> {period?.startDate ? format(new Date(period.startDate), 'PPP') : 'N/A'}</p>
            <p><strong>Original End Date:</strong> {period?.endDate ? format(new Date(period.endDate), 'PPP') : 'N/A'}</p>
            <p><strong>Members:</strong> {period?.memberPeriods?.length || 0}</p>
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
            {isSubmitting ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ending...
              </>
              :
              <>
                <AlertTriangle className="h-4 w-4" />
                End Period
              </>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 