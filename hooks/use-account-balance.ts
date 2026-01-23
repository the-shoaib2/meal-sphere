import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';

export type AccountBalance = {
  id: string;
  userId: string;
  roomId: string;
  balance: number;
  updatedAt: string;
  updatedBy?: string;
  user?: { id: string; name: string; image?: string; email?: string };
  room?: { id: string; name: string };
};

export type MemberWithBalance = {
  userId: string;
  user: { id: string; name: string; image?: string; email?: string };
  role: string;
  joinedAt: string;
  balance: number;
  availableBalance?: number;
  totalSpent?: number;
  mealCount?: number;
  mealRate?: number;
};

export type UserBalance = {
  user: { id: string; name: string; image?: string; email?: string };
  balance: number;
  role?: string; 
  availableBalance?: number;
  totalSpent?: number;
  mealCount?: number;
  mealRate?: number;
  currentPeriod?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    isLocked: boolean;
  } | null;
};

export type GroupBalanceSummary = {
  members: MemberWithBalance[];
  groupTotalBalance: number;
  totalExpenses: number;
  mealRate: number;
  totalMeals: number;
  netGroupBalance: number;
}

export type AccountTransaction = {
  id: string;
  userId: string;
  targetUserId: string;
  roomId: string;
  amount: number;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; image?: string; email?: string };
  targetUser: { id: string; name: string; image?: string; email?: string };
};

export type HistoryRecord = {
  id: string;
  action: string;
  amount: number;
  type: string;
  description: string | null;
  changedAt: string;
  changedByUser: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  };
};

export interface BalancePageData {
  summary: GroupBalanceSummary | null;
  ownBalance: UserBalance | null;
  ownTransactions: AccountTransaction[];
  history?: HistoryRecord[];
  currentPeriod: any;
  roomData: any;
  userRole: string | null;
  groupId?: string;
}

export function useGroupBalances(roomId: string, enabled: boolean = true, includeDetails: boolean = false, initialData?: BalancePageData) {
  // Priority: 1. Passed initialData, 2. Server-side data
  const effectiveInitialData = initialData && initialData.groupId === roomId ? initialData.summary : undefined;

  return useQuery<GroupBalanceSummary | null>({
    queryKey: ['group-balances', roomId, includeDetails],
    queryFn: async () => {
      const res = await fetch(`/api/account-balance?roomId=${roomId}&all=true&includeDetails=${includeDetails}`, { cache: 'no-store' });
      if (res.status === 403) {
        // User doesn't have privileged access, return null instead of throwing
        return null;
      }
      if (!res.ok) throw new Error('Failed to fetch group balances');
      return res.json();
    },
    enabled: !!roomId && enabled && !effectiveInitialData,
    initialData: effectiveInitialData,
    retry: (failureCount, error) => {
      // Don't retry on 403 errors (insufficient permissions)
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false,
  });
}

export function useGetBalance(roomId: string, userId: string, includeDetails: boolean = false, initialData?: BalancePageData) {
  const effectiveInitialData = initialData && initialData.groupId === roomId ? initialData.ownBalance : undefined;

  return useQuery<UserBalance>({
    queryKey: ['user-balance', roomId, userId, includeDetails],
    queryFn: async () => {
      const res = await fetch(`/api/account-balance?roomId=${roomId}&userId=${userId}&includeDetails=${includeDetails}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch user balance');
      return res.json();
    },
    enabled: !!roomId && !!userId && !effectiveInitialData,
    initialData: effectiveInitialData as UserBalance,
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false,
  });
}

export function useGetTransactions(roomId: string, userId: string, periodId?: string, initialData?: BalancePageData) {
  const effectiveInitialData = initialData && initialData.groupId === roomId ? initialData.ownTransactions : undefined;

  return useQuery<AccountTransaction[]>({
    queryKey: ['user-transactions', roomId, userId, periodId],
    queryFn: async () => {
      const params = new URLSearchParams({
        roomId,
        userId,
        ...(periodId && { periodId }),
      });
      const res = await fetch(`/api/account-balance/transactions?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!roomId && !!userId && !effectiveInitialData,
    initialData: effectiveInitialData,
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false,
  });
}

export function useGetAccountHistory(roomId: string, userId: string, periodId?: string, initialData?: BalancePageData) {
  const effectiveInitialData = initialData && initialData.groupId === roomId ? initialData.history : undefined;

  return useQuery<HistoryRecord[]>({
    queryKey: ['account-history', userId, roomId, periodId],
    queryFn: async () => {
      const url = new URL('/api/account-balance/history', window.location.origin);
      url.searchParams.set('userId', userId);
      url.searchParams.set('roomId', roomId);
      if (periodId) url.searchParams.set('periodId', periodId);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch account history');
      return res.json();
    },
    enabled: !!roomId && !!userId && !effectiveInitialData,
    initialData: effectiveInitialData,
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: {
      roomId: string;
      targetUserId: string;
      amount: number;
      type: string;
      description?: string;
    }) => {
      const res = await fetch('/api/account-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add transaction');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-balances', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', variables.roomId, variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions', variables.roomId, variables.targetUserId] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; amount: number; description?: string; type: string }) => {
      const res = await fetch(`/api/account-balance/transactions/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: data.amount, description: data.description, type: data.type }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/account-balance/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
    },
  });
}

export function useUpdateBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const res = await fetch(`/api/account-balance?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance }),
      });
      if (!res.ok) throw new Error('Failed to update balance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
    },
  });
}

export function useCreateBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roomId, balance }: { userId: string; roomId: string; balance: number }) => {
      const res = await fetch('/api/account-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId, balance, type: 'ADJUSTMENT' }),
      });
      if (!res.ok) throw new Error('Failed to create balance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
    },
  });
}

export function useDeleteBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/account-balance?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete balance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
    },
  });
}

export type DashboardSummary = {
  totalUserMeals: number;
  totalAllMeals: number;
  currentRate: number;
  currentBalance: number;
  availableBalance: number;
  totalCost: number;
  activeRooms: number;
  totalActiveGroups: number;
  totalMembers: number;
};

export function useDashboardSummary() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', activeGroup?.id],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for more responsive updates
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });
}
