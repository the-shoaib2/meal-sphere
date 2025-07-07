'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar, Plus, AlertCircle, CheckCircle, Clock, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentPeriod, useStartPeriod } from '@/hooks/use-periods';
import { useActiveGroup } from '@/contexts/group-context';
import { useSession } from 'next-auth/react';
import { CreatePeriodDialog } from './create-period-dialog';
import { PeriodStatus } from '@prisma/client';

const PRIVILEGED_ROLES = [
  'OWNER',
  'ADMIN',
  'MODERATOR',
  'MANAGER',
  'MEAL_MANAGER',
];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

export function PeriodStatusCard() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  const { data: currentPeriod, isLoading } = useCurrentPeriod();
  const startPeriodMutation = useStartPeriod();
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  if (!activeGroup) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Period Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const member = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = member?.role || 'MEMBER';
  const hasPrivilege = isPrivileged(userRole);

  // No period exists
  if (!currentPeriod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span>No Active Period</span>
          </CardTitle>
          <CardDescription>
            No meal period is currently active for this group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A meal period needs to be created to start tracking meals, expenses, and payments.
            </AlertDescription>
          </Alert>
          
          {hasPrivilege ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Only admins and managers can create new periods.
              </div>
              <CreatePeriodDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={async (data) => {
                  try {
                    await startPeriodMutation.mutateAsync(data);
                    setShowCreateDialog(false);
                  } catch (error) {
                    // Error is handled by the mutation
                    console.error('Error creating period:', error);
                  }
                }}
                disabled={startPeriodMutation.isPending}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Contact an admin or manager to create a new meal period.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Period is active
  if (currentPeriod.status === PeriodStatus.ACTIVE) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Active Period</span>
          </CardTitle>
          <CardDescription>
            {currentPeriod.name} • {format(new Date(currentPeriod.startDate), 'MMM dd, yyyy')}
            {currentPeriod.endDate ? ` - ${format(new Date(currentPeriod.endDate), 'MMM dd, yyyy')}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="default">Active</Badge>
              {currentPeriod.isLocked && <Badge variant="destructive">Locked</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.ceil((new Date(currentPeriod.endDate || new Date()).getTime() - new Date(currentPeriod.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Period is ended
  if (currentPeriod.status === PeriodStatus.ENDED) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <span>Period Ended</span>
          </CardTitle>
          <CardDescription>
            {currentPeriod.name} • {format(new Date(currentPeriod.startDate), 'MMM dd, yyyy')} - {format(new Date(currentPeriod.endDate || new Date()), 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Ended</Badge>
              {currentPeriod.isLocked && <Badge variant="destructive">Locked</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.ceil((new Date(currentPeriod.endDate || new Date()).getTime() - new Date(currentPeriod.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This period has ended. No new meals, expenses, or payments can be added.
            </AlertDescription>
          </Alert>
          
          {hasPrivilege ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Create a new period to continue tracking meals and expenses.
              </div>
              <CreatePeriodDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={async (data) => {
                  try {
                    await startPeriodMutation.mutateAsync(data);
                    setShowCreateDialog(false);
                  } catch (error) {
                    // Error is handled by the mutation
                    console.error('Error creating period:', error);
                  }
                }}
                disabled={startPeriodMutation.isPending}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Contact an admin or manager to create a new meal period.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Period is archived
  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <span>Period Archived</span>
        </CardTitle>
        <CardDescription>
          {currentPeriod.name} • {format(new Date(currentPeriod.startDate), 'MMM dd, yyyy')} - {format(new Date(currentPeriod.endDate || new Date()), 'MMM dd, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Archived</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            This period has been archived and is read-only.
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 