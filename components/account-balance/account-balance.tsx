"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useActiveGroup } from '@/contexts/group-context';
import { useGroupBalances, useGetBalance, useGetTransactions, type BalancePageData } from '@/hooks/use-account-balance';
import { useCurrentPeriod } from '@/hooks/use-periods';
import { PrivilegedView } from '@/components/account-balance/privileged-view';
import { MemberView } from '@/components/account-balance/member-view';
import { LoadingWrapper, PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodNotFoundCard } from "@/components/periods/period-not-found-card"
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { useGroups } from '@/hooks/use-groups';
import { PageHeader } from '@/components/shared/page-header';
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
import { AddBalanceButton } from '@/components/account-balance/add-balance-button';

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

  // Sync dialog state with custom events
  React.useEffect(() => {
    const handleOpenDialog = () => setIsAddDialogOpen(true);
    window.addEventListener('open-add-transaction-dialog', handleOpenDialog);
    return () => window.removeEventListener('open-add-transaction-dialog', handleOpenDialog);
  }, [isAddDialogOpen]);

  const isForbidden = (balancesError as any)?.message?.includes('403') ||
    (ownBalanceError as any)?.message?.includes('403') ||
    (transactionsError as any)?.message?.includes('403');

  if (isForbidden) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Balance"
          description="Access restriction"
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
          description="Track your meal expenses and payments"
        />
        <NoGroupState />
      </div>
    );
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

  return (
    <div>
      <LoadingWrapper
        isLoading={
          isLoadingBalances ||
          isLoadingOwnBalance ||
          isLoadingTransactions ||
          !activeGroup ||
          (hasPrivilege ? !groupData : !ownBalance)
        }
        minHeight="60vh"
      >
        {hasPrivilege ? (
          <PrivilegedView
            groupData={groupData!}
            userRole={userRole!}
          />
        ) : (
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
        )}
      </LoadingWrapper>
      {hasPrivilege && (
        <AccountTransactionDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          groupId={activeGroup?.id || ''}
        />
      )}
    </div>
  );
}



export function UserAccountBalanceDetail({ initialData, targetUserId, viewerRole }: { initialData?: BalancePageData, targetUserId: string, viewerRole?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  // State for Add/Edit Transaction Dialog
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<AccountTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
  const [historyTransactionId, setHistoryTransactionId] = React.useState<string | null>(null);

  // Sync dialog state with custom events
  React.useEffect(() => {
    const handleOpenDialog = () => {
      setEditingTransaction(null);
      setIsTransactionDialogOpen(true);
    };
    window.addEventListener('open-add-transaction-dialog', handleOpenDialog);
    return () => window.removeEventListener('open-add-transaction-dialog', handleOpenDialog);
  }, [isTransactionDialogOpen]);

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
    // 1. Refresh React Query cache first for instant client updates
    refetchBalance();
    refetchTransactions();

    // 2. Refresh server components to sync page-level data (e.g. breadcrumbs, header stats)
    router.refresh();
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



  const totalReceived = allFilteredTransactions.filter(t => t.targetUserId === userId && t.amount > 0)?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalSpent = allFilteredTransactions.filter(t => t.userId === userId && t.amount < 0)?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const totalTransactions = allFilteredTransactions.length || 0;
  const availableBalance = userBalance?.balance || 0;

  return (
    <LoadingWrapper
      isLoading={isLoadingBalance || !userBalance}
      minHeight="60vh"
    >
      <div className="space-y-6">

        <AccountInfoCard
          userBalance={userBalance}
          targetUserRole={targetUserRole}
          availableBalance={availableBalance}
          totalSpent={totalSpent}
          totalReceived={totalReceived}
          totalTransactions={totalTransactions}
          headerAction={isAdmin && <AddBalanceButton />}
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
          isLoading={isLoadingTransactions}
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
    </LoadingWrapper>
  );
}
