import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  createShoppingItemAction, 
  updateShoppingItemAction, 
  deleteShoppingItemAction, 
  clearPurchasedShoppingItemsAction,
  getShoppingListAction
} from '@/lib/actions/shopping.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export interface ShoppingItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  purchased: boolean;
  userId: string;
  roomId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface AddShoppingItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  description?: string;
}

/**
 * Hook for managing group shopping list data and actions.
 */
export function useShopping(groupId?: string, periodId?: string) {
  const queryClient = useQueryClient();

  // Query Shopping Items
  const { data: items = [], isLoading, error } = useQuery<ShoppingItem[], Error>({
    queryKey: [QUERY_KEYS.SHOPPING_LIST, groupId, periodId],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await getShoppingListAction(groupId, { periodId });
      if (!res.success || !res.shoppingItems) throw new Error(res.message || 'Failed to fetch shopping list');
      
      return res.shoppingItems.map((item: any) => ({
        ...item,
        name: item.name || item.description, // Compatibility
        date: item.date?.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })) as ShoppingItem[];
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const addItem = useMutation({
    mutationFn: async (newItem: AddShoppingItemInput) => {
      if (!groupId) throw new Error('No active group selected');
      const formData = new FormData();
      formData.append('roomId', groupId);
      formData.append('description', newItem.name);
      formData.append('amount', (newItem.quantity || 1).toString());
      formData.append('date', new Date().toISOString());

      const result = await createShoppingItemAction(formData);
      if (!result.success || !result.shoppingItem) throw new Error(result.message || 'Failed to add item');
      return result.shoppingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHOPPING_LIST, groupId] });
      toast.success('Item added to shopping list');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ShoppingItem> & { id: string }) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await updateShoppingItemAction(id, groupId, data);
      if (!result.success) throw new Error(result.message || 'Failed to update item');
      return result.shoppingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHOPPING_LIST, groupId] });
      toast.success('Item updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await deleteShoppingItemAction(itemId, groupId);
      if (!result.success) throw new Error(result.message || 'Failed to delete item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHOPPING_LIST, groupId] });
      toast.success('Item removed from list');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clearPurchased = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error('No active group selected');
      const result = await clearPurchasedShoppingItemsAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to clear items');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHOPPING_LIST, groupId] });
      toast.success('Purchased items cleared');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    clearPurchased,
  };
}
