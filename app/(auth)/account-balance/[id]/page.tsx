"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useActiveGroup } from '@/contexts/group-context';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  useGetBalance,
  useGetTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type AccountTransaction
} from '@/hooks/use-account-balance';
import { useCurrentPeriod } from '@/hooks/use-periods';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { TransactionHistory } from '@/components/account-balance/transaction-history';
import { TransactionList } from '@/components/account-balance/transaction-list';
import { AccountInfoCard } from '@/components/account-balance/account-info-card';

const PRIVILEGED_ROLES = [
  'ADMIN',
  'ACCOUNTANT',
];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}



export default function UserAccountBalancePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  // State for Add/Edit Transaction Dialog
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountTransaction | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionType, setTransactionType] = useState('ADJUSTMENT');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [historyTransactionId, setHistoryTransactionId] = useState<string | null>(null);



  const userId = params?.id as string;

  // Sync dialog state with search params
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('add') === 'true' && !isTransactionDialogOpen) {
      openAddTransactionDialog();
    }
  }, [searchParams]);

  const { data: currentPeriod } = useCurrentPeriod();
  const { data: userBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useGetBalance(activeGroup?.id || '', userId);
  const { data: transactions, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useGetTransactions(activeGroup?.id || '', userId, currentPeriod?.id);

  // Fetch current user's balance to get their role (for privilege check)
  const { data: currentUserBalance } = useGetBalance(activeGroup?.id || '', session?.user?.id || '');

  // Get current user's role - prioritize API response over activeGroup.members
  const currentUserMember = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = currentUserBalance?.role || currentUserMember?.role || 'MEMBER';

  // Get target user's role - prioritize API response over activeGroup.members
  // The API response is more reliable as it's fetched directly from the database
  const targetUserRole = userBalance?.role ||
    activeGroup?.members?.find(m => m.userId === userId)?.role ||
    'MEMBER';

  // Check if current user has privileged access (ADMIN or ACCOUNTANT)
  const hasPrivilege = isPrivileged(userRole);
  const isAdmin = userRole === 'ADMIN';

  // Debug logging for role detection

  // Filter transactions to only those involving this user (as receiver or self-transactions)
  const allFilteredTransactions = transactions?.filter(
    t => t.targetUserId === userId || (t.userId === userId && t.targetUserId === userId)
  ) || [];

  // Filter out negative amounts for display in the list (but keep them for calculations)
  const filteredTransactions = allFilteredTransactions.filter(t => t.amount > 0);

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

  const openHistoryDialog = (transactionId: string) => {
    setHistoryTransactionId(transactionId);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Account Details</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasPrivilege && (
            <Button className="flex-1 sm:flex-none" onClick={openAddBalanceDialog}>
              <Plus className="h-4 w-4 mr-2" /> Add Balance
            </Button>
          )}
        </div>
      </div>

      <AccountInfoCard
        userBalance={userBalance}
        targetUserRole={targetUserRole}
        availableBalance={availableBalance}
        totalSpent={totalSpent}
        totalReceived={totalReceived}
        totalTransactions={totalTransactions}
      />

      {historyTransactionId ? (
        <TransactionHistory
          transactionId={historyTransactionId}
          onBack={() => setHistoryTransactionId(null)}
        />
      ) : (
        <TransactionList
          transactions={filteredTransactions}
          hasPrivilege={hasPrivilege}
          isAdmin={isAdmin}
          onEdit={openEditTransactionDialog}
          onDelete={openDeleteDialog}
          onViewHistory={openHistoryDialog}
        />
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
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24" /> {/* Back button */}
        <Skeleton className="h-8 w-48" /> {/* Title */}
      </div>
      <Skeleton className="h-9 w-36" /> {/* Add Transaction button */}
    </div>

    {/* Combined User Info and Stats Card Skeleton */}
    <Card>
      <CardContent className="p-4">
        {/* User Info Skeleton */}
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

        {/* Stats Grid Skeleton - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Transaction History Skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
); 