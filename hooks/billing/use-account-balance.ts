import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export type AccountBalance = {
  id: string;
  userId: string;
  roomId: string;
  balance: number;
  updatedAt: string;
  user?: { id: string; name: string; image?: string; email?: string };
};

export type GroupBalanceSummary = {
  members: any[];
  groupTotalBalance: number;
  totalExpenses: number;
  mealRate: number;
  totalMeals: number;
  netGroupBalance?: number;
};

/**
 * Hook for fetching group-wide balances.
 */
export function useGroupBalances(roomId?: string, includeDetails: boolean = false) {
  return useQuery<GroupBalanceSummary | null, Error>({
    queryKey: [QUERY_KEYS.GROUP_BALANCES, roomId, includeDetails],
    queryFn: async () => {
      if (!roomId) return null;
      const { getGroupBalanceSummaryAction } = await import('@/lib/actions/account-balance.actions');
      const res = await getGroupBalanceSummaryAction(roomId, includeDetails);
      if (!res.success) {
        if (res.message === "Insufficient permissions") return null;
        throw new Error(res.message);
      }
      return res.summary;
    },
    enabled: !!roomId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a specific user's balance in a room.
 */
export function useUserBalance(roomId?: string, userId?: string, includeDetails: boolean = false) {
  const { data: session } = useSession();
  const targetUserId = userId || session?.user?.id;

  return useQuery<any, Error>({
    queryKey: [QUERY_KEYS.USER_BALANCE, roomId, targetUserId, includeDetails],
    queryFn: async () => {
      if (!roomId || !targetUserId) return null;
      const { getUserBalanceAction } = await import('@/lib/actions/account-balance.actions');
      const res = await getUserBalanceAction(roomId, targetUserId, includeDetails);
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    enabled: !!roomId && !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching transaction history for a user.
 */
export function useUserTransactions(roomId?: string, userId?: string, periodId?: string) {
  const { data: session } = useSession();
  const targetUserId = userId || session?.user?.id;

  return useInfiniteQuery({
    queryKey: ['user-transactions', roomId, targetUserId, periodId],
    queryFn: async ({ pageParam }) => {
      if (!roomId || !targetUserId) return { items: [], nextCursor: undefined };
      const { getTransactionsAction } = await import('@/lib/actions/account-balance.actions');
      const res = await getTransactionsAction(roomId, targetUserId, periodId, pageParam as string | undefined, 10);
      if (!res.success) throw new Error(res.message);
      return { items: res.items, nextCursor: res.nextCursor };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    enabled: !!roomId && !!targetUserId,
  });
}

/**
 * Hook for account management mutations.
 */
export function useAccountMutations() {
  const queryClient = useQueryClient();

  const addTransaction = useMutation({
    mutationFn: async (transaction: {
      roomId: string;
      targetUserId: string;
      amount: number;
      type: string;
      description?: string;
    }) => {
      const { createTransactionAction } = await import('@/lib/actions/account-balance.actions');
      const res = await createTransactionAction(transaction);
      if (!res.success) throw new Error(res.message);
      return res.transaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_BALANCES, variables.roomId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_BALANCE, variables.roomId] });
      toast.success('Transaction added successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { deleteTransactionAction } = await import('@/lib/actions/account-balance.actions');
      const res = await deleteTransactionAction(id);
      if (!res.success) throw new Error(res.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_BALANCES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_BALANCE] });
      toast.success('Transaction deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    addTransaction,
    deleteTransaction,
  };
}

/**
 * Hook for global dashboard summary.
 */
export function useDashboardSummary() {
  const { status } = useSession();

  return useQuery<any, Error>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    },
    enabled: status === 'authenticated',
    staleTime: 2 * 60 * 1000,
  });
}
