"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useActiveGroup } from '@/contexts/group-context';
import { useGroupBalances, useGetBalance, useGetTransactions, type BalancePageData } from '@/hooks/use-account-balance';
import { useCurrentPeriod } from '@/hooks/use-periods';
import PrivilegedView from '@/components/account-balance/privileged-view';
import MemberView from '@/components/account-balance/member-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"
import { Badge } from '@/components/ui/badge';
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { useGroups } from '@/hooks/use-groups';
import { PageHeader } from '@/components/shared/page-header';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  History,
  TrendingDown,
  TrendingUp,
  Receipt,
  Utensils,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type AccountTransaction
} from '@/hooks/use-account-balance';

import { TransactionHistory } from '@/components/account-balance/transaction-history';
import { TransactionList } from '@/components/account-balance/transaction-list';
import { AccountInfoCard } from '@/components/account-balance/account-info-card';
import { Button } from '@/components/ui/button';
import { BALANCE_PRIVILEGED_ROLES, hasBalancePrivilege } from '@/lib/auth/balance-permissions';
import { InsufficientPermissionsState } from '@/components/empty-states/insufficient-permissions-state';

const PRIVILEGED_ROLES = BALANCE_PRIVILEGED_ROLES;

function isPrivileged(role?: string) {
  return hasBalancePrivilege(role);
}

export default function AccountBalancePanel({ initialData }: { initialData?: BalancePageData }) {
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
  const { data: ownTransactions, isLoading: isLoadingTransactions, error: transactionsError } = useGetTransactions(activeGroup?.id!, session?.user?.id!, currentPeriod?.id, initialData);

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

  // Header (always visible)
  const header = (
    <PageHeader
      heading="Account Balances"
      text={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span>Manage all user balances and transactions.</span>
          {currentPeriod && (
            <Badge variant={currentPeriod.isLocked ? "destructive" : "default"} className="text-xs w-fit">
              {currentPeriod.name} {currentPeriod.isLocked ? "(Locked)" : ""}
            </Badge>
          )}
        </div>
      }
    >
      <Badge
        variant={hasPrivilege ? "default" : "outline"}
        className={hasPrivilege ? "bg-blue-600 hover:bg-blue-700" : ""}
      >
        {userRole ? userRole.replace('_', ' ') : 'MEMBER'}
      </Badge>
    </PageHeader>
  );

  // Show PeriodNotFoundCard only if:
  // 1. No period from initialData AND
  // 2. No period from hook AND
  // 3. Hook is not loading
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
        groupId={activeGroup?.id}
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

export function UserAccountBalanceDetail({ initialData, targetUserId }: { initialData?: BalancePageData, targetUserId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  // State for Add/Edit Transaction Dialog
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<AccountTransaction | null>(null);
  const [transactionAmount, setTransactionAmount] = React.useState('');
  const [transactionDescription, setTransactionDescription] = React.useState('');
  const [transactionType, setTransactionType] = React.useState('ADJUSTMENT');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
  const [historyTransactionId, setHistoryTransactionId] = React.useState<string | null>(null);

  const userId = targetUserId;

  // Sync dialog state with search params
  const searchParams = useSearchParams();
  React.useEffect(() => {
    if (searchParams?.get('add') === 'true' && !isTransactionDialogOpen) {
      openAddTransactionDialog();
    }
  }, [searchParams]);

  const { data: userBalance, isLoading: isLoadingBalance, refetch: refetchBalance, error: balanceError } = useGetBalance(activeGroup?.id || '', userId, true, initialData);
  const { data: transactions, isLoading: isLoadingTransactions, refetch: refetchTransactions, error: transactionsError } = useGetTransactions(activeGroup?.id || '', userId, initialData?.currentPeriod?.id, initialData);

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

  // Get current user's role
  const currentUserMember = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = currentUserBalance?.role || currentUserMember?.role || 'MEMBER';

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

  const openAddTransactionDialog = () => {
    setEditingTransaction(null);
    setTransactionAmount('');
    setTransactionDescription('');
    setTransactionType('ADJUSTMENT');
    setIsTransactionDialogOpen(true);
  };

  const openAddBalanceDialog = () => {
    setEditingTransaction(null);
    setTransactionAmount('');
    setTransactionDescription('');
    setTransactionType('PAYMENT');
    setIsTransactionDialogOpen(true);
  };

  const openEditTransactionDialog = (transaction: AccountTransaction) => {
    setEditingTransaction(transaction);
    setTransactionAmount(String(transaction.amount));
    setTransactionDescription(transaction.description || '');
    setTransactionType(transaction.type);
    setIsTransactionDialogOpen(true);
  };

  const openDeleteDialog = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setIsDeleteDialogOpen(true);
  };

  const handleTransactionSubmit = async () => {
    try {
      if (!activeGroup?.id) return;
      const amount = parseFloat(transactionAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      let description = transactionDescription.trim();
      if (!description) {
        const typeLabel = transactionType.charAt(0).toUpperCase() + transactionType.slice(1).toLowerCase();
        const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT' }).format(amount);
        description = `${typeLabel} of ${formattedAmount}`;
      }

      if (editingTransaction) {
        await updateTransactionMutation.mutateAsync({
          id: editingTransaction.id,
          amount,
          description,
          type: transactionType,
        });
        toast.success('Transaction updated successfully');
      } else {
        await addTransactionMutation.mutateAsync({
          targetUserId: userId,
          roomId: activeGroup.id,
          amount,
          description,
          type: transactionType
        });
        toast.success('Transaction added successfully');
      }

      setIsTransactionDialogOpen(false);
      refetchBalance();
      refetchTransactions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to process transaction');
    }
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
      <PageHeader
        heading="Account Details"
        text={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-muted-foreground">|</span>
            <span>View and manage specific user accounts</span>
          </div>
        }
      >
        {hasPrivilege && (
          <Button size="sm" onClick={openAddBalanceDialog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Balance
          </Button>
        )}
      </PageHeader>

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
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input id="amount" type="number" value={transactionAmount} onChange={e => setTransactionAmount(e.target.value)} placeholder="Enter amount" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={transactionDescription} onChange={e => setTransactionDescription(e.target.value)} placeholder="Transaction description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTransactionSubmit} className="flex-1" disabled={updateTransactionMutation.isPending || addTransactionMutation.isPending}>
              {editingTransaction ? (
                updateTransactionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'
              ) : (
                addTransactionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </>
                )
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const UserBalanceSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-9 w-36" />
    </div>

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