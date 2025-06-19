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
    queryKey: ['shopping', groupId],
    queryFn: async (): Promise<ApiShoppingItem[]> => {
      if (!groupId) return [];
      const { data } = await axios.get<ApiShoppingItem[]>(`/api/shopping?roomId=${groupId}`);
      return data;
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
    enabled: !!groupId, // Only run the query when groupId is available
  });

  // Add a new item to the shopping list
  const addItem = useMutation<ShoppingItem, Error, AddShoppingItemInput>({
    mutationFn: async (newItem): Promise<ShoppingItem> => {
      if (!groupId) throw new Error('No active group selected');
      
      const formData = new FormData();
      formData.append('roomId', groupId);
      formData.append('description', newItem.name);
      formData.append('amount', (newItem.quantity || 0).toString());
      formData.append('date', new Date().toISOString());
      
      const { data } = await axios.post<ShoppingItem>('/api/shopping', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      const { data } = await axios.patch<ShoppingItem>(`/api/shopping?id=${updatedItem.id}&groupId=${groupId}`, {
        ...updatedItem,
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
      const { data } = await axios.patch<ShoppingItem>(
        '/api/shopping',
        { id, purchased },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
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
      await axios.delete(`/api/shopping?id=${itemId}&groupId=${groupId}`);
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
