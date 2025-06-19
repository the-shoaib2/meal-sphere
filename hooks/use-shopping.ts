import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useActiveGroup } from '@/contexts/group-context';

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

export function useShopping() {
  const { activeGroup } = useActiveGroup();
  const queryClient = useQueryClient();
  const groupId = activeGroup?.id;

  // Fetch shopping list for the active group
  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ShoppingItem[], Error>({
    queryKey: ['shopping', groupId],
    queryFn: async (): Promise<ShoppingItem[]> => {
      if (!groupId) return [];
      const { data } = await axios.get<ShoppingItem[]>(`/api/shopping?groupId=${groupId}`);
      return data;
    },
    enabled: !!groupId, // Only run the query when groupId is available
  });

  // Add a new item to the shopping list
  const addItem = useMutation<ShoppingItem, Error, AddShoppingItemInput>({
    mutationFn: async (newItem): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');
      const { data } = await axios.post<ShoppingItem>('/api/shopping', {
        ...newItem,
        groupId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Update an existing item
  const updateItem = useMutation<ShoppingItem, Error, UpdateShoppingItemInput>({
    mutationFn: async (updatedItem): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');
      const { data } = await axios.patch<ShoppingItem>(`/api/shopping/${updatedItem.id}`, {
        ...updatedItem,
        groupId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Toggle item's purchased status
  const togglePurchased = useMutation<ShoppingItem, Error, { id: string; purchased: boolean }>({
    mutationFn: async ({ id, purchased }): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');
      const { data } = await axios.patch<ShoppingItem>(`/api/shopping/${id}`, {
        purchased,
        groupId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Delete an item
  const deleteItem = useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      if (!groupId) throw new Error('No active group selected');
      await axios.delete(`/api/shopping/${itemId}?groupId=${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
    },
  });

  // Clear all purchased items
  const clearPurchased = useMutation<void, Error>({
    mutationFn: async () => {
      if (!groupId) throw new Error('No active group selected');
      await axios.delete(`/api/shopping/clear-purchased?groupId=${groupId}`);
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
