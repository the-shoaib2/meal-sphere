import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useActiveGroup } from '@/contexts/group-context';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export interface Meal {
  id: string;
  date: string;
  type: MealType;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface AddMealInput {
  date: Date;
  type: MealType;
  userId: string;
  roomId: string;
}

export interface UpdateMealInput {
  id: string;
  type: MealType;
  date: Date;
  userId: string;
  roomId: string;
}

export function useMeal() {
  const { activeGroup } = useActiveGroup();
  const queryClient = useQueryClient();
  const groupId = activeGroup?.id;

  // Fetch meals for the active group
  const {
    data: meals = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Meal[]>({
    queryKey: ['meals', groupId],
    queryFn: async (): Promise<Meal[]> => {
      if (!groupId) return [];
      const { data } = await axios.get(`/api/meals?groupId=${groupId}`);
      return data as Meal[];
    },
    enabled: !!groupId,
  });

  // Add a new meal
  const addMeal = useMutation({
    mutationFn: async (input: Omit<AddMealInput, 'roomId'>) => {
      if (!groupId) throw new Error('No group selected');
      const { data } = await axios.post('/api/meals', {
        ...input,
        roomId: groupId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', groupId] });
    },
  });

  // Update an existing meal
  const updateMeal = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMealInput) => {
      const { data } = await axios.put(`/api/meals/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', groupId] });
    },
  });

  // Delete a meal
  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/meals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', groupId] });
    },
  });

  // Get meals for a specific date
  const getMealsByDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return meals.filter(meal => meal.date.startsWith(dateString));
  };

  // Check if a specific meal exists for a date
  const hasMeal = (date: Date, type: MealType) => {
    const dateString = date.toISOString().split('T')[0];
    return meals.some(
      meal => meal.date.startsWith(dateString) && meal.type === type
    );
  };

  // Toggle a meal (add if not exists, remove if exists)
  const toggleMeal = async (date: Date, type: MealType, userId: string) => {
    const dateString = date.toISOString();
    const existingMeal = meals.find(
      meal => meal.date.startsWith(dateString.split('T')[0]) && 
             meal.type === type && 
             meal.userId === userId
    );

    if (existingMeal) {
      await deleteMeal.mutateAsync(existingMeal.id);
    } else if (groupId) {
      await addMeal.mutateAsync({
        date: new Date(dateString),
        type,
        userId,
      });
    }
  };

  return {
    meals,
    isLoading,
    error,
    refetch,
    addMeal,
    updateMeal,
    deleteMeal,
    getMealsByDate,
    hasMeal,
    toggleMeal,
  };
}
