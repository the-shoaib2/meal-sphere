import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useActiveGroup } from '@/contexts/group-context';
import { ExpenseType } from '@prisma/client';

export interface ExtraExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: ExpenseType;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  roomId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface AddExtraExpenseInput {
  description: string;
  amount: number;
  date: Date;
  type: ExpenseType;
  receipt?: File;
}

export interface UpdateExtraExpenseInput extends Partial<Omit<ExtraExpense, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'user' | 'receiptUrl'>> {
  id: string;
  receipt?: File;
}

export function useExtraExpense() {
  const { activeGroup } = useActiveGroup();
  const queryClient = useQueryClient();
  const groupId = activeGroup?.id;

  // Fetch extra expenses for the active group
  const {
    data: expenses = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ExtraExpense[]>({
    queryKey: ['extraExpenses', groupId],
    queryFn: async (): Promise<ExtraExpense[]> => {
      if (!groupId) return [];
      const { data } = await axios.get<ExtraExpense[]>(`/api/expenses?roomId=${groupId}`);
      return data;
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Add a new extra expense
  const addExpense = useMutation<ExtraExpense, Error, AddExtraExpenseInput>({
    mutationFn: async (newExpense): Promise<ExtraExpense> => {
      if (!groupId) throw new Error('No active group selected');

      const formData = new FormData();
      formData.append('roomId', groupId);
      formData.append('description', newExpense.description);
      formData.append('amount', newExpense.amount.toString());
      formData.append('date', newExpense.date.toISOString());
      formData.append('type', newExpense.type);

      if (newExpense.receipt) {
        formData.append('receipt', newExpense.receipt);
      }

      const { data } = await axios.post<ExtraExpense>('/api/expenses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraExpenses', groupId] });
    },
  });

  // Update an existing expense
  const updateExpense = useMutation<ExtraExpense, Error, UpdateExtraExpenseInput>({
    mutationFn: async (updatedExpense): Promise<ExtraExpense> => {
      const { id, receipt, ...rest } = updatedExpense;

      const formData = new FormData();
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      if (receipt) {
        formData.append('receipt', receipt);
      }

      const { data } = await axios.patch<ExtraExpense>(`/api/expenses/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraExpenses', groupId] });
    },
  });

  // Delete an expense
  const deleteExpense = useMutation<void, Error, string>({
    mutationFn: async (expenseId): Promise<void> => {
      await axios.delete(`/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraExpenses', groupId] });
    },
  });

  return {
    expenses,
    isLoading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch,
  };
}
