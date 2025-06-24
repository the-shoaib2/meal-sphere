"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';
import { useGroupBalances, useGetBalance, useGetTransactions } from '@/hooks/use-account-balance';
import PrivilegedView from '@/components/account-balance/privileged-view';
import MemberView from '@/components/account-balance/member-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN', 'ACCOUNTANT'];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

export default function AccountBalancePanel() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  const member = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = member?.role;
  const hasPrivilege = isPrivileged(userRole);

  const { data: groupData, isLoading: isLoadingBalances } = useGroupBalances(activeGroup?.id!, hasPrivilege, true);
  const { data: ownBalance, isLoading: isLoadingOwnBalance } = useGetBalance(activeGroup?.id!, session?.user?.id!, true);
  const { data: ownTransactions, isLoading: isLoadingTransactions } = useGetTransactions(activeGroup?.id!, session?.user?.id!);

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
        <Skeleton className="h-8 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPrivilege ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);