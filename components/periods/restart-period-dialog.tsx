'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, AlertTriangle, Database, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { MealPeriod } from '@prisma/client';

interface RestartPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (periodId: string, newName?: string, withData?: boolean) => void;
  period: MealPeriod | null;
  isLoading?: boolean;
}

export function RestartPeriodDialog({
  open,
  onOpenChange,
  onConfirm,
  period,
  isLoading = false
}: RestartPeriodDialogProps) {
  const [newName, setNewName] = useState('');
  const [withData, setWithData] = useState(false);

  const handleConfirm = () => {
    if (!period) return;
    console.log('Restarting period:', { periodId: period.id, newName: newName.trim() || undefined, withData });
    onConfirm(period.id, newName.trim() || undefined, withData);
    // Don't reset state here - let the parent component handle it after success
  };

  const handleCancel = () => {
    setNewName('');
    setWithData(false);
    onOpenChange(false);
  };

  if (!period) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5" />
            Restart Period
          </DialogTitle>
          <DialogDescription>
            Create a new period with the same settings as "{period.name}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newName" className="text-sm font-medium">New Period Name (Optional)</Label>
            <Input
              id="newName"
              placeholder={`${period.name} (Restarted)`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use "{period.name} (Restarted)"
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 pr-4">
                <Label className="text-sm font-medium">Include Period Data</Label>
                <p className="text-xs text-muted-foreground">
                  Copy all meals, expenses, and transactions
                </p>
              </div>
              <Switch
                checked={withData}
                onCheckedChange={setWithData}
              />
            </div>

            {withData && (
              <Alert className="border-blue-200 bg-blue-50 py-3">
                <Database className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  <strong>With Data:</strong> Includes all meals, shopping, expenses, and transactions from the original period.
                </AlertDescription>
              </Alert>
            )}

            {!withData && (
              <Alert className="border-orange-200 bg-orange-50 py-3">
                <FileText className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-xs">
                  <strong>Without Data:</strong> Starts fresh with only settings copied. Recommended for new period cycles.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="text-xs space-y-1.5 bg-muted/30 p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="font-medium">Original Period:</span>
              <span className="text-muted-foreground">{period.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Date Range:</span>
              <span className="text-muted-foreground">
                {format(new Date(period.startDate), 'MMM dd, yyyy')} - {period.endDate ? format(new Date(period.endDate), 'MMM dd, yyyy') : 'Ongoing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Carry Forward:</span>
              <span className="text-muted-foreground">{period.carryForward ? 'Yes' : 'No'}</span>
            </div>
            {period.carryForward && period.closingBalance && (
              <div className="flex justify-between">
                <span className="font-medium">Opening Balance:</span>
                <span className="text-muted-foreground">৳{period.closingBalance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart Period {withData ? 'with Data' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 