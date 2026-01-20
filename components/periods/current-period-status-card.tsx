import React from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EndPeriodDialog } from './end-period-dialog';
import { Calendar, Users, Unlock, Lock } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';


export function CurrentPeriodStatusCard({
  currentPeriod,
  activeGroup,
  isPrivileged,
  showEndDialog,
  setShowEndDialog,
  handleEndPeriod,
  setUnlockTargetPeriod,
  setUnlockToActive,
  setShowUnlockDialog,
  handleLockPeriod,
}: {
  currentPeriod: any;
  activeGroup: any;
  isPrivileged: boolean;
  showEndDialog: boolean;
  setShowEndDialog: (open: boolean) => void;
  handleEndPeriod: (endDate?: Date) => Promise<void>;
  setUnlockTargetPeriod: (period: any) => void;
  setUnlockToActive: (active: boolean) => void;
  setShowUnlockDialog: (open: boolean) => void;
  handleLockPeriod: (id: string) => void;
}) {
  if (!currentPeriod) return null;
  return (
    <Card className="bg-muted">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Calendar className="h-5 w-5 sm:h-5 sm:w-5 text-green-600" />
          <span>Current Active Period</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {currentPeriod.name} • {format(new Date(currentPeriod.startDate), 'MMM d, yyyy')}{currentPeriod.endDate ? ` - ${format(new Date(currentPeriod.endDate), 'MMM d, yyyy')}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                <NumberTicker value={activeGroup?.members?.length || 0} /> members
              </span>
            </div>
            {/* Status badge can be added here if needed */}
          </div>
          {isPrivileged && (
            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
              <EndPeriodDialog
                open={showEndDialog}
                onOpenChange={setShowEndDialog}
                onConfirm={() => handleEndPeriod()}
                period={currentPeriod}
              />
              {currentPeriod.isLocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUnlockTargetPeriod(currentPeriod);
                    setUnlockToActive(currentPeriod.status === 'ACTIVE');
                    setShowUnlockDialog(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLockPeriod(currentPeriod.id)}
                  className="w-full sm:w-auto"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

