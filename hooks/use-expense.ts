import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useActiveGroup } from '@/contexts/group-context';
import { ExpenseType } from '@prisma/client';
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from '@/lib/actions/expense.actions';

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

export interface ExpensesPageData {
  expenses: ExtraExpense[];
  currentPeriod?: any;
  roomData?: any;
  userRole?: string | null;
  groupId?: string;
}

export function useExtraExpense(initialData?: ExpensesPageData) {
  const { activeGroup } = useActiveGroup();
  const queryClient = useQueryClient();
  const groupId = activeGroup?.id;

  // Priority: 1. Passed initialData, 2. Server-side data
  const effectiveInitialData = initialData && initialData.groupId === groupId ? initialData.expenses : undefined;

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
      const { getExpensesAction } = await import('@/lib/actions/expense.actions');
      const res = await getExpensesAction(groupId);
      if (!res.success) throw new Error(res.message);
      return res.expenses!.map((e: any) => ({
        ...e,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })) as unknown as ExtraExpense[];
    },
    enabled: !!groupId && !effectiveInitialData,
    initialData: effectiveInitialData,
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
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

      const result = await createExpenseAction(formData);
      if (!result.success) {
        throw new Error(result.message || 'Failed to add expense');
      }

      return result.expense as unknown as ExtraExpense;
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

      const result = await updateExpenseAction(id, formData);
      if (!result.success) {
        throw new Error(result.message || 'Failed to update expense');
      }

      return result.expense as unknown as ExtraExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraExpenses', groupId] });
    },
  });

  // Delete an expense
  const deleteExpense = useMutation<void, Error, string>({
    mutationFn: async (expenseId): Promise<void> => {
      const result = await deleteExpenseAction(expenseId);
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete expense');
      }
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
