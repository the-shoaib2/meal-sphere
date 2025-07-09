"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';
import { useGroupBalances, useGetBalance, useGetTransactions } from '@/hooks/use-account-balance';
import { useCurrentPeriod } from '@/hooks/use-periods';
import PrivilegedView from '@/components/account-balance/privileged-view';
import MemberView from '@/components/account-balance/member-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"
import { Badge } from '@/components/ui/badge';

const PRIVILEGED_ROLES = ['ADMIN', 'MANAGER','MEAL_MANAGER'];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

export default function AccountBalancePanel() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  const member = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = member?.role;
  const hasPrivilege = isPrivileged(userRole);

  const { data: currentPeriod, isLoading: isPeriodLoading } = useCurrentPeriod();
  const { data: groupData, isLoading: isLoadingBalances } = useGroupBalances(activeGroup?.id!, hasPrivilege, true);
  const { data: ownBalance, isLoading: isLoadingOwnBalance } = useGetBalance(activeGroup?.id!, session?.user?.id!, true);
  const { data: ownTransactions, isLoading: isLoadingTransactions } = useGetTransactions(activeGroup?.id!, session?.user?.id!, currentPeriod?.id);

  if (!activeGroup) {
    return <BalanceSkeleton hasPrivilege={false} />;
  }

  // Header (always visible)
  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h1 className="text-2xl font-bold">Account Balances</h1>
          {currentPeriod && (
            <Badge variant={currentPeriod.isLocked ? "destructive" : "default"} className="text-xs w-fit">
              {currentPeriod.name} {currentPeriod.isLocked ? "(Locked)" : ""}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">Manage all user balances and transactions.</p>
      </div>
      <Badge variant="outline">{userRole}</Badge>
    </div>
  );

  // Show PeriodNotFoundCard if no period
  if (!currentPeriod && !isPeriodLoading) {
    return (
      <div className="space-y-6">
        {header}
        <PeriodNotFoundCard
          userRole={userRole}
          isLoading={isPeriodLoading}
          groupId={activeGroup?.id}
          userId={session?.user?.id}
        />
      </div>
    );
  }

  if (isLoadingBalances || (hasPrivilege && !groupData) || (!hasPrivilege && (isLoadingOwnBalance || isLoadingTransactions))) {
    return <BalanceSkeleton hasPrivilege={hasPrivilege} />;
  }
  
  if (hasPrivilege) {
    return (
      <>
        {header}
        <PrivilegedView
          groupData={groupData!}
          userRole={userRole!}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <MemberView
        balance={ownBalance}
        transactions={ownTransactions || []}
        userRole={userRole!}
        session={session}
      />
    </>
  );
}

const BalanceSkeleton = ({ hasPrivilege }: { hasPrivilege: boolean }) => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Skeleton className="h-8 w-48 mb-2" /> {/* Title */}
          <Skeleton className="h-5 w-32" /> {/* Period badge */}
        </div>
        <Skeleton className="h-4 w-64 mt-1" /> {/* Subtitle */}
      </div>
      <Skeleton className="h-6 w-20 rounded" /> {/* User role badge */}
    </div>

    {/* Stat Cards Skeleton - 2 rows of 4 cards each */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-md" /> {/* Icon */}
            <div>
              <Skeleton className="h-4 w-24 mb-1" /> {/* Title */}
              <Skeleton className="h-6 w-20" /> {/* Value */}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-md" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Table/List Skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" /> {/* Table title */}
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(hasPrivilege ? 6 : 5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-2 border rounded-md">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);