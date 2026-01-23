"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useActiveGroup } from '@/contexts/group-context';
import { useGroupBalances, useGetBalance, useGetTransactions, type BalancePageData } from '@/hooks/use-account-balance';
import { useCurrentPeriod } from '@/hooks/use-periods';
import { PrivilegedView } from '@/components/account-balance/privileged-view';
import { MemberView } from '@/components/account-balance/member-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodNotFoundCard } from "@/components/periods/period-not-found-card"
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { useGroups } from '@/hooks/use-groups';
import { PageHeader } from '@/components/shared/page-header';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type AccountTransaction
} from '@/hooks/use-account-balance';

import { TransactionHistory } from '@/components/account-balance/transaction-history';
import { TransactionList } from '@/components/account-balance/transaction-list';
import { AccountInfoCard } from '@/components/account-balance/account-info-card';
import { hasBalancePrivilege } from '@/lib/auth/balance-permissions';
import { InsufficientPermissionsState } from '@/components/empty-states/insufficient-permissions-state';
import { AccountTransactionDialog } from '@/components/account-balance/account-transaction-dialog';

function isPrivileged(role?: string) {
  return hasBalancePrivilege(role);
}

export function AccountBalancePanel({ initialData }: { initialData?: BalancePageData }) {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  const { data: userGroups = [], isLoading: isLoadingGroups } = useGroups();
  const router = useRouter(); // Added useRouter initialization

  const userRoleFromHook = (activeGroup as any)?.userRole || activeGroup?.members?.find(m => m.userId === session?.user?.id)?.role;
  const userRole = (initialData && initialData.groupId === activeGroup?.id) ? initialData.userRole : userRoleFromHook;
  const hasPrivilege = isPrivileged(userRole);

  const { data: currentPeriodFromHook, isLoading: isPeriodLoading } = useCurrentPeriod();

  // CRITICAL FIX: Prioritize initialData.currentPeriod to prevent false "no period" state
  // Only fall back to hook data if initialData is not for the current group
  const currentPeriod = (initialData && initialData.groupId === activeGroup?.id && initialData.currentPeriod)
    ? initialData.currentPeriod
    : currentPeriodFromHook;

  // const handleViewDetails = (userId: string) => {
  //   window.dispatchEvent(new CustomEvent('routeChangeStart'));
  //   router.push(`/account-balance/${userId}`);
  // };
  const { data: groupData, isLoading: isLoadingBalances, error: balancesError } = useGroupBalances(activeGroup?.id!, hasPrivilege, true, initialData);
  const { data: ownBalance, isLoading: isLoadingOwnBalance, error: ownBalanceError } = useGetBalance(activeGroup?.id!, session?.user?.id!, true, initialData);
  const {
    data: ownTransactionsData,
    fetchNextPage: fetchNextOwn,
    hasNextPage: hasNextOwn,
    isFetchingNextPage: isFetchingNextOwn,
    isLoading: isLoadingTransactions,
    error: transactionsError
  } = useGetTransactions(activeGroup?.id!, session?.user?.id!, currentPeriod?.id, initialData);

  const ownTransactions = React.useMemo(() =>
    ownTransactionsData?.pages?.flatMap((p: any) => p.items as AccountTransaction[]) || [],
    [ownTransactionsData]
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  // Sync dialog state with search params
  const searchParams = useSearchParams();
  React.useEffect(() => {
    if (searchParams?.get('add') === 'true' && !isAddDialogOpen) {
      setIsAddDialogOpen(true);
    }
  }, [searchParams]);

  const isForbidden = (balancesError as any)?.message?.includes('403') ||
    (ownBalanceError as any)?.message?.includes('403') ||
    (transactionsError as any)?.message?.includes('403');

  if (isForbidden) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Balance"
          text="Access restriction"
        />
        <InsufficientPermissionsState
          title="Access Restricted"
          description="It seems you don't have the necessary roles or your session has expired. Please contact your manager if you believe this is an error."
        />
      </div>
    );
  }

  // Check if user has no groups - show empty state
  if (!isLoadingGroups && userGroups.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Balance"
          text="Track your meal expenses and payments"
        />
        <NoGroupState />
      </div>
    );
  }

  if (!activeGroup) {
    return <BalanceSkeleton hasPrivilege={false} />;
  }


  // Show PeriodNotFoundCard only if:
  // 1. No period from initialData AND
  // 2. No period from hook AND
  // 3. Hook is not loading
  if (!currentPeriod && !isPeriodLoading) {
    return (
      <div className="space-y-6">
        <PeriodNotFoundCard
          userRole={userRole}
          isLoading={isPeriodLoading}
          groupId={activeGroup?.id}
          userId={session?.user?.id}
        />
      </div>
    );
  }

  if (hasPrivilege) {
    return (
      <>
        <PrivilegedView
          groupData={groupData!}
          userRole={userRole!}
        />
        <AccountTransactionDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          groupId={activeGroup.id}
          members={groupData?.members || []}
        />
      </>
    );
  }

  return (
    <MemberView
      balance={ownBalance}
      transactions={ownTransactions || []}
      userRole={userRole!}
      session={session}
      groupId={activeGroup?.id}
      onFetchNextPage={fetchNextOwn}
      hasNextPage={hasNextOwn}
      isFetchingNextPage={isFetchingNextOwn}
    />
  );
}

const BalanceSkeleton = ({ hasPrivilege }: { hasPrivilege: boolean }) => (
  <div className="space-y-6 pt-4">
    {/* Stat Cards Skeleton - 2 rows of 4 cards each */}

    {/* Stat Cards Skeleton - 2 rows of 4 cards each */}
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
            <Skeleton className="h-4 w-4 sm:h-6 sm:w-6 rounded-md mb-1 sm:mb-0" /> {/* Icon */}
            <div className="flex flex-col items-center sm:items-start w-full">
              <Skeleton className="h-2.5 sm:h-4 w-16 sm:w-24 mb-1" /> {/* Title */}
              <Skeleton className="h-4 sm:h-6 w-12 sm:w-20" /> {/* Value */}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
            <Skeleton className="h-4 w-4 sm:h-6 sm:w-6 rounded-md mb-1 sm:mb-0" />
            <div className="flex flex-col items-center sm:items-start w-full">
              <Skeleton className="h-2.5 sm:h-4 w-16 sm:w-24 mb-1" />
              <Skeleton className="h-4 sm:h-6 w-12 sm:w-20" />
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

export function UserAccountBalanceDetail({ initialData, targetUserId, viewerRole }: { initialData?: BalancePageData, targetUserId: string, viewerRole?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  const searchParams = useSearchParams();

  // State for Add/Edit Transaction Dialog
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<AccountTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
  const [historyTransactionId, setHistoryTransactionId] = React.useState<string | null>(null);

  // Sync dialog state with search params (Keep for bookmarks/direct links)
  React.useEffect(() => {
    if (searchParams?.get('add') === 'true' && !isTransactionDialogOpen) {
      setIsTransactionDialogOpen(true);
    }
  }, [searchParams]);

  const userId = targetUserId;

  const { data: userBalance, isLoading: isLoadingBalance, refetch: refetchBalance, error: balanceError } = useGetBalance(activeGroup?.id || '', userId, true, initialData);
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
    error: transactionsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGetTransactions(activeGroup?.id || '', userId, initialData?.currentPeriod?.id, initialData);

  const transactions = React.useMemo(() =>
    transactionsData?.pages?.flatMap((p: any) => p.items as AccountTransaction[]) || [],
    [transactionsData]
  );

  // Handle 403 Forbidden errors
  const isForbidden = (balanceError as any)?.message?.includes('403') ||
    (transactionsError as any)?.message?.includes('403');

  if (isForbidden) {
    return (
      <InsufficientPermissionsState
        title="Account Access Denied"
        description="You do not have permission to view this account's details. Only admins, accountants, and the account owner can access this information."
      />
    );
  }

  // Fetch current user's balance to get their role (for privilege check)
  const { data: currentUserBalance } = useGetBalance(activeGroup?.id || '', session?.user?.id || '', false, initialData);

  // Get current user's role - PREFER SERVER PROP
  const currentUserMember = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = viewerRole || currentUserBalance?.role || currentUserMember?.role || 'MEMBER';

  // Get target user's role
  const targetUserRole = userBalance?.role ||
    activeGroup?.members?.find(m => m.userId === userId)?.role ||
    'MEMBER';

  const hasPrivilege = isPrivileged(userRole);
  const isAdmin = userRole === 'ADMIN';

  // Filter transactions
  const allFilteredTransactions = React.useMemo(() => {
    return Array.from(
      new Map(
        (transactions || [])
          .filter(t => t.targetUserId === userId || (t.userId === userId && t.targetUserId === userId))
          .map(t => [t.id, t])
      ).values()
    );
  }, [transactions, userId]);

  const filteredTransactions = React.useMemo(() => {
    return allFilteredTransactions.filter(t => t.amount > 0);
  }, [allFilteredTransactions]);

  const addTransactionMutation = useAddTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  const openAddBalanceDialog = () => {
    setEditingTransaction(null);
    setIsTransactionDialogOpen(true);
  };

  const openEditTransactionDialog = (transaction: AccountTransaction) => {
    setEditingTransaction(transaction);
    setIsTransactionDialogOpen(true);
  };

  const openDeleteDialog = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setIsDeleteDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    refetchBalance();
    refetchTransactions();
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransactionMutation.mutateAsync(transactionId);
      toast.success('Transaction deleted successfully');
      refetchBalance();
      refetchTransactions();
      setIsDeleteDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete transaction');
    }
  };

  if (isLoadingBalance || isLoadingTransactions || !userBalance) {
    return <UserBalanceSkeleton />;
  }

  const totalReceived = allFilteredTransactions.filter(t => t.targetUserId === userId && t.amount > 0)?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalSpent = allFilteredTransactions.filter(t => t.userId === userId && t.amount < 0)?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const totalTransactions = allFilteredTransactions.length || 0;
  const availableBalance = userBalance?.balance || 0;

  return (
    <div className="space-y-6">

      <AccountInfoCard
        userBalance={userBalance}
        targetUserRole={targetUserRole}
        availableBalance={availableBalance}
        totalSpent={totalSpent}
        totalReceived={totalReceived}
        totalTransactions={totalTransactions}
      />

      <TransactionList
        transactions={filteredTransactions}
        hasPrivilege={hasPrivilege}
        isAdmin={isAdmin}
        onEdit={openEditTransactionDialog}
        onDelete={openDeleteDialog}
        onViewHistory={(id) => {
          if (!id) {
            setHistoryTransactionId(null);
            return;
          }
          setHistoryTransactionId(id);
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 100);
        }}
        isHistoryOpen={!!historyTransactionId}
        onFetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />

      {historyTransactionId && (
        <div className="mt-8 border-t pt-8">
          <TransactionHistory
            transactionId={historyTransactionId}
            userId={userId}
            roomId={activeGroup?.id}
            periodId={initialData?.currentPeriod?.id}
            onBack={() => setHistoryTransactionId(null)}
            initialData={historyTransactionId === 'ALL' ? initialData?.history : undefined}
          />
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteTransactionMutation.isPending}
              onClick={() => {
                if (transactionToDelete) {
                  handleDeleteTransaction(transactionToDelete);
                }
              }}
            >
              {deleteTransactionMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AccountTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        groupId={activeGroup?.id || ''}
        targetUserId={userId}
        targetUser={userBalance?.user}
        transaction={editingTransaction}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}

const UserBalanceSkeleton = () => (
  <div className="space-y-6 pt-4">
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-3 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <Skeleton className="h-12 w-full mb-1" /><Skeleton className="h-12 w-full mb-1" /><Skeleton className="h-12 w-full mb-1" /><Skeleton className="h-12 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);