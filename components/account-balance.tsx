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

  const { data: currentPeriod } = useCurrentPeriod();
  const { data: groupData, isLoading: isLoadingBalances } = useGroupBalances(activeGroup?.id!, hasPrivilege, true);
  const { data: ownBalance, isLoading: isLoadingOwnBalance } = useGetBalance(activeGroup?.id!, session?.user?.id!, true);
  const { data: ownTransactions, isLoading: isLoadingTransactions } = useGetTransactions(activeGroup?.id!, session?.user?.id!, currentPeriod?.id);

  if (!activeGroup) {
    return <BalanceSkeleton hasPrivilege={false} />;
  }

  if (isLoadingBalances || (hasPrivilege && !groupData) || (!hasPrivilege && (isLoadingOwnBalance || isLoadingTransactions))) {
    return <BalanceSkeleton hasPrivilege={hasPrivilege} />;
  }
  
  if (hasPrivilege) {
    return (
      <PrivilegedView
        groupData={groupData!}
        userRole={userRole!}
      />
    );
  }

  return (
    <MemberView
      balance={ownBalance}
      transactions={ownTransactions || []}
      userRole={userRole!}
      session={session}
    />
  );
}

const BalanceSkeleton = ({ hasPrivilege }: { hasPrivilege: boolean }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid Skeleton - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(hasPrivilege ? 6 : 3)].map((_, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-4 flex flex-col gap-2">
              <Skeleton className="h-4 w-1/2 mb-1" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ))}
        </div>
        {/* Table/List Skeleton */}
        <div className="space-y-3">
          {[...Array(hasPrivilege ? 4 : 2)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2 border rounded-md">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);