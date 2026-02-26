import React from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EndPeriodDialog } from './end-period-dialog';
import { Calendar, Users, Unlock, Lock } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Badge } from '@/components/ui/badge';


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
  isLocking,
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
  isLocking?: boolean;
}) {
  if (!currentPeriod) return null;

  return (
    <Card className="relative overflow-hidden border-none text-white w-full">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        {activeGroup?.bannerUrl ? (
          <img
            src={activeGroup.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/90 to-primary/40" />
        )}
        <div className="absolute inset-0 bg-white/10 dark:bg-black/50 backdrop-blur-[4px]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/20 to-transparent" />
      </div>

      <div className="relative z-10 p-3 sm:p-4">

        {/* Top Indicators */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-400 opacity-90" />
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-white/80 uppercase">
                Current Active Period
              </span>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-white pl-6 leading-none">
              {currentPeriod.name}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 pl-6 space-y-1 sm:space-y-0 pt-1">
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-white/60">
                <span className="font-medium text-white/80">Start:</span>
                <span>{format(new Date(currentPeriod.startDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-white/60">
                <span className="font-medium text-white/80">End:</span>
                <span>{currentPeriod.endDate ? format(new Date(currentPeriod.endDate), 'MMM d, yyyy') : 'Ongoing'}</span>
              </div>
            </div>
          </div>

          <Badge
            variant={currentPeriod.isLocked ? "destructive" : "secondary"}
            className={!currentPeriod.isLocked ? "bg-green-600 hover:bg-green-700 text-white border-none transition-colors" : ""}
          >
            <span className={`h-1.5 w-1.5 rounded-full mr-2 ${currentPeriod.isLocked ? 'bg-red-200' : 'bg-green-200 animate-pulse'}`} />
            {currentPeriod.isLocked ? 'Locked' : 'Active'}
          </Badge>
        </div>


        {/* Unified Bottom Row: Group Info & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-2 gap-y-4">
          {/* Group Information (Left) */}
          <div className="space-y-1.5 px-6">

            <span className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-white/60">
              {/* <Users className="h-3 w-3 mr-1.5 opacity-80" /> */}
              <NumberTicker className='mr-1 text-white' value={activeGroup?.members?.length || 0} /> Members
            </span>

            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white/90 leading-tight">
              {activeGroup?.name || 'Unnamed Group'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 sm:px-0">
            {isPrivileged && (
              <>
                <EndPeriodDialog
                  open={showEndDialog}
                  onOpenChange={setShowEndDialog}
                  onConfirm={() => handleEndPeriod()}
                  period={currentPeriod}
                />

                <Button
                  variant="outline"
                  className='text-primary bg-background hover:bg-background/80 hover:text-primary flex-1 sm:flex-none'
                  onClick={() => {
                    if (currentPeriod.isLocked) {
                      setUnlockTargetPeriod(currentPeriod);
                      setUnlockToActive(currentPeriod.status === 'ACTIVE');
                      setShowUnlockDialog(true);
                    } else {
                      handleLockPeriod(currentPeriod.id);
                    }
                  }}
                  disabled={isLocking}
                >
                  {currentPeriod.isLocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                      Unlock Period
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1" />
                      Lock Period
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
