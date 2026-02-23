import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useActiveGroup } from '@/contexts/group-context';
import { 
  createShoppingItemAction, 
  updateShoppingItemAction, 
  deleteShoppingItemAction, 
  clearPurchasedShoppingItemsAction 
} from '@/lib/actions/shopping.actions';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  purchased: boolean;
  addedById: string;
  addedBy: {
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
}

interface UpdateShoppingItemInput extends Partial<Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt' | 'addedById' | 'addedBy'>> {
  id: string;
}

export interface ShoppingPageData {
  items: any[];
  statistics?: any;
  currentPeriod?: any;
  roomData?: any;
  userRole?: string | null;
  groupId?: string;
}

export function useShopping(periodId?: string, initialData?: ShoppingPageData) {
  const { activeGroup } = useActiveGroup();
  const queryClient = useQueryClient();
  const groupId = activeGroup?.id;

  // Priority: 1. Passed initialData, 2. Server-side data
  const effectiveInitialData = initialData && initialData.groupId === groupId ? initialData.items : null;

  // Fetch shopping list for the active group
  interface ApiShoppingItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit: string | null;
    purchased: boolean;
    date: string;
    receiptUrl: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string;
    roomId: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
    };
  }

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ApiShoppingItem[], Error, ShoppingItem[]>({
    queryKey: ['shopping', groupId, periodId],
    queryFn: async (): Promise<ApiShoppingItem[]> => {
      if (!groupId) return [];
      const { getShoppingListAction } = await import('@/lib/actions/shopping.actions');
      const res = await getShoppingListAction(groupId, { periodId });
      if (!res.success) throw new Error(res.message);
      return res.shoppingItems!.map((item: any) => ({
        ...item,
        date: item.date.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        user: item.user
      })) as unknown as ApiShoppingItem[];
    },
    select: (data) =>
      data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || undefined,
        purchased: item.purchased,
        addedById: item.userId,
        addedBy: {
          id: item.user.id,
          name: item.user.name,
          image: item.user.image
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
    enabled: !!groupId && !effectiveInitialData, // Only run if no initial data
    initialData: effectiveInitialData as ApiShoppingItem[],
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false,
  });

  // Shopping mutation context type
  type ShoppingContext = {
    previousItems: ShoppingItem[] | undefined;
  };

  // Add a new item to the shopping list
  const addItem = useMutation<ShoppingItem, Error, AddShoppingItemInput, ShoppingContext>({
    mutationFn: async (newItem): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');

      const formData = new FormData();
      formData.append('roomId', groupId);
      formData.append('description', newItem.name);
      formData.append('amount', (newItem.quantity || 1).toString());
      formData.append('date', new Date().toISOString());

      const result = await createShoppingItemAction(formData);
      if (!result.success) {
        throw new Error(result.message || 'Failed to add item');
      }
      return result.shoppingItem as unknown as ShoppingItem;
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['shopping', groupId] });
      const previousItems = queryClient.getQueryData<ShoppingItem[]>(['shopping', groupId]);
      
      const optimisticItem: ShoppingItem = {
        id: `temp-${Date.now()}`,
        name: newItem.name,
        quantity: newItem.quantity || 1,
        unit: newItem.unit,
        purchased: false,
        addedById: 'me', // Generic placeholder
        addedBy: { id: 'me', name: 'You', image: null },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(['shopping', groupId], (old: ShoppingItem[] = []) => [optimisticItem, ...old]);
      return { previousItems };
    },
    onError: (err, newItem, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['shopping', groupId], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Update an existing item
  const updateItem = useMutation<ShoppingItem, Error, UpdateShoppingItemInput, ShoppingContext>({
    mutationFn: async (updatedItem): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');
      const result = await updateShoppingItemAction(updatedItem.id, groupId, updatedItem);
      if (!result.success) {
        throw new Error(result.message || 'Failed to update item');
      }
      return result.shoppingItem as unknown as ShoppingItem;
    },
    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({ queryKey: ['shopping', groupId] });
      const previousItems = queryClient.getQueryData<ShoppingItem[]>(['shopping', groupId]);
      queryClient.setQueryData(['shopping', groupId], (old: ShoppingItem[] = []) => 
        old.map(item => item.id === updatedItem.id ? { ...item, ...updatedItem } : item)
      );
      return { previousItems };
    },
    onError: (err, updatedItem, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['shopping', groupId], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Toggle item's purchased status
  const togglePurchased = useMutation<ShoppingItem, Error, { id: string; purchased: boolean }, ShoppingContext>({
    mutationFn: async ({ id, purchased }): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');
      const result = await updateShoppingItemAction(id, groupId, { purchased });
      if (!result.success) {
        throw new Error(result.message || 'Failed to toggle item');
      }
      return result.shoppingItem as unknown as ShoppingItem;
    },
    onMutate: async ({ id, purchased }) => {
      await queryClient.cancelQueries({ queryKey: ['shopping', groupId] });
      const previousItems = queryClient.getQueryData<ShoppingItem[]>(['shopping', groupId]);
      queryClient.setQueryData(['shopping', groupId], (old: ShoppingItem[] = []) => 
        old.map(item => item.id === id ? { ...item, purchased } : item)
      );
      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['shopping', groupId], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Delete an item
  const deleteItem = useMutation<void, Error, string, ShoppingContext>({
    mutationFn: async (itemId) => {
      if (!groupId) throw new Error('No active group selected');
      const result = await deleteShoppingItemAction(itemId, groupId);
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete item');
      }
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['shopping', groupId] });
      const previousItems = queryClient.getQueryData<ShoppingItem[]>(['shopping', groupId]);
      queryClient.setQueryData(['shopping', groupId], (old: ShoppingItem[] = []) => 
        old.filter(item => item.id !== itemId)
      );
      return { previousItems };
    },
    onError: (err, itemId, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['shopping', groupId], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Clear all purchased items
  const clearPurchased = useMutation<void, Error>({
    mutationFn: async () => {
      if (!groupId) throw new Error('No active group selected');
      const result = await clearPurchasedShoppingItemsAction(groupId);
      if (!result.success) {
        throw new Error(result.message || 'Failed to clear items');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    togglePurchased,
    deleteItem,
    clearPurchased,
    refetch,
    groupId,
  };
}
