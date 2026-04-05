import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ExpenseType } from '@prisma/client';
import { 
  createExpenseAction, 
  updateExpenseAction, 
  deleteExpenseAction,
  getExpensesAction
} from '@/lib/actions/expense.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

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

/**
 * Hook for managing group extra expenses.
 */
export function useExtraExpense(groupId?: string) {
  const queryClient = useQueryClient();

  // Query Expenses
  const { data: expenses = [], isLoading, error } = useQuery<ExtraExpense[]>({
    queryKey: [QUERY_KEYS.EXTRA_EXPENSES, groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await getExpensesAction(groupId);
      if (!res.success || !res.expenses) throw new Error(res.message || 'Failed to fetch expenses');
      
      return res.expenses.map((e: any) => ({
        ...e,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })) as ExtraExpense[];
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const addExpense = useMutation({
    mutationFn: async (newExpense: AddExtraExpenseInput) => {
      if (!groupId) throw new Error('No active group selected');
      const formData = new FormData();
      formData.append('roomId', groupId);
      formData.append('description', newExpense.description);
      formData.append('amount', newExpense.amount.toString());
      formData.append('date', newExpense.date.toISOString());
      formData.append('type', newExpense.type);
      if (newExpense.receipt) formData.append('receipt', newExpense.receipt);

      const result = await createExpenseAction(formData);
      if (!result.success || !result.expense) throw new Error(result.message || 'Failed to add expense');
      return result.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXTRA_EXPENSES, groupId] });
      toast.success('Expense added successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, receipt, ...data }: Partial<AddExtraExpenseInput> & { id: string }) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value instanceof Date) formData.append(key, value.toISOString());
          else formData.append(key, String(value));
        }
      });
      if (receipt) formData.append('receipt', receipt);

      const result = await updateExpenseAction(id, formData);
      if (!result.success || !result.expense) throw new Error(result.message || 'Failed to update expense');
      return result.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXTRA_EXPENSES, groupId] });
      toast.success('Expense updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      const result = await deleteExpenseAction(expenseId);
      if (!result.success) throw new Error(result.message || 'Failed to delete expense');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXTRA_EXPENSES, groupId] });
      toast.success('Expense deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    expenses,
    isLoading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
