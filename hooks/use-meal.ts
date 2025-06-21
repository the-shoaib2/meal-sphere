import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

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

export interface GuestMeal {
  id: string;
  date: string;
  type: MealType;
  count: number;
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

export interface MealSettings {
  id: string;
  roomId: string;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  autoMealEnabled: boolean;
  mealCutoffTime: string;
  maxMealsPerDay: number;
  allowGuestMeals: boolean;
  guestMealLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutoMealSettings {
  id: string;
  userId: string;
  roomId: string;
  isEnabled: boolean;
  breakfastEnabled: boolean;
  lunchEnabled: boolean;
  dinnerEnabled: boolean;
  startDate: string;
  endDate?: string;
  excludedDates: string[];
  excludedMealTypes: MealType[];
  createdAt: string;
  updatedAt: string;
}

export interface MealSummary {
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

interface UseMealReturn {
  // Data
  meals: Meal[];
  guestMeals: GuestMeal[];
  mealSettings: MealSettings | null;
  autoMealSettings: AutoMealSettings | null;
  isLoading: boolean;
  error: Error | null;
  
  // Queries
  useMealsByDate: (date: Date) => Meal[];
  useGuestMealsByDate: (date: Date) => GuestMeal[];
  useMealSummary: (startDate: Date, endDate: Date) => MealSummary[];
  useMealCount: (date: Date, type: MealType) => number;
  
  // Mutations
  toggleMeal: (date: Date, type: MealType, userId: string) => Promise<void>;
  addGuestMeal: (date: Date, type: MealType, count: number) => Promise<void>;
  updateGuestMeal: (guestMealId: string, count: number) => Promise<void>;
  deleteGuestMeal: (guestMealId: string) => Promise<void>;
  
  // Settings
  updateMealSettings: (settings: Partial<MealSettings>) => Promise<void>;
  updateAutoMealSettings: (settings: Partial<AutoMealSettings>) => Promise<void>;
  
  // Utilities
  hasMeal: (date: Date, type: MealType, userId?: string) => boolean;
  canAddMeal: (date: Date, type: MealType) => boolean;
  isAutoMealTime: (date: Date, type: MealType) => boolean;
  getUserGuestMeals: (date: Date, userId?: string) => GuestMeal[];
  getUserGuestMealCount: (date: Date, userId?: string) => number;
}

export function useMeal(roomId?: string): UseMealReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Fetch meals
  const { data: meals = [], isLoading: isLoadingMeals, error: mealsError } = useQuery<Meal[]>({
    queryKey: ['meals', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const { data } = await axios.get<Meal[]>(`/api/meals?roomId=${roomId}`);
      return data;
    },
    enabled: !!roomId && !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Fetch guest meals
  const { data: guestMeals = [], isLoading: isLoadingGuestMeals, error: guestMealsError } = useQuery<GuestMeal[]>({
    queryKey: ['guest-meals', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const { data } = await axios.get<GuestMeal[]>(`/api/meals/guest?roomId=${roomId}`);
      return data;
    },
    enabled: !!roomId && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Fetch meal settings
  const { data: mealSettings = null, isLoading: isLoadingSettings } = useQuery<MealSettings | null>({
    queryKey: ['meal-settings', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const { data } = await axios.get<MealSettings>(`/api/meals/settings?roomId=${roomId}`);
      return data;
    },
    enabled: !!roomId && !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });

  // Fetch auto meal settings
  const { data: autoMealSettings = null, isLoading: isLoadingAutoSettings } = useQuery<AutoMealSettings | null>({
    queryKey: ['auto-meal-settings', roomId, session?.user?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return null;
      const { data } = await axios.get<AutoMealSettings>(`/api/meals/auto-settings?roomId=${roomId}&userId=${session.user.id}`);
      return data;
    },
    enabled: !!roomId && !!session?.user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Toggle meal mutation
  const toggleMealMutation = useMutation({
    mutationFn: async ({ date, type, userId }: { date: Date; type: MealType; userId: string }) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      await axios.post('/api/meals', {
        date: formattedDate,
        type,
        roomId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', roomId] });
      queryClient.invalidateQueries({ queryKey: ['meal-summary', roomId] });
    },
    onError: (error: any) => {
      console.error('Error toggling meal:', error);
      toast.error(error.response?.data?.message || 'Failed to update meal');
    }
  });

  // Add guest meal mutation
  const addGuestMealMutation = useMutation({
    mutationFn: async ({ date, type, count }: { date: Date; type: MealType; count: number }) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      await axios.post('/api/meals/guest', {
        date: formattedDate,
        type,
        count,
        roomId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guest-meals', roomId] });
      queryClient.invalidateQueries({ queryKey: ['meal-summary', roomId] });
      toast.success(`Added ${variables.count} guest meal(s) successfully`);
    },
    onError: (error: any) => {
      console.error('Error adding guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to add guest meal');
    }
  });

  // Update guest meal mutation
  const updateGuestMealMutation = useMutation({
    mutationFn: async ({ guestMealId, count }: { guestMealId: string; count: number }) => {
      await axios.patch(`/api/meals/guest/${guestMealId}`, { count });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-meals', roomId] });
      queryClient.invalidateQueries({ queryKey: ['meal-summary', roomId] });
      toast.success('Guest meal updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to update guest meal');
    }
  });

  // Delete guest meal mutation
  const deleteGuestMealMutation = useMutation({
    mutationFn: async (guestMealId: string) => {
      await axios.delete(`/api/meals/guest/${guestMealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-meals', roomId] });
      queryClient.invalidateQueries({ queryKey: ['meal-summary', roomId] });
      toast.success('Guest meal deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to delete guest meal');
    }
  });

  // Update meal settings mutation
  const updateMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<MealSettings>) => {
      await axios.patch(`/api/meals/settings?roomId=${roomId}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-settings', roomId] });
      toast.success('Meal settings updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating meal settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update meal settings');
    }
  });

  // Update auto meal settings mutation
  const updateAutoMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AutoMealSettings>) => {
      await axios.patch(`/api/meals/auto-settings?roomId=${roomId}&userId=${session?.user?.id}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-meal-settings', roomId, session?.user?.id] });
      toast.success('Auto meal settings updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating auto meal settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update auto meal settings');
    }
  });

  // Utility functions
  const useMealsByDate = useCallback((date: Date): Meal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return meals.filter(meal => meal.date.startsWith(dateStr));
  }, [meals]);

  const useGuestMealsByDate = useCallback((date: Date): GuestMeal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return guestMeals.filter(meal => meal.date.startsWith(dateStr));
  }, [guestMeals]);

  const useMealCount = useCallback((date: Date, type: MealType): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const regularMeals = meals.filter(meal => 
      meal.date.startsWith(dateStr) && meal.type === type
    ).length;
    const guestMealsCount = guestMeals.filter(meal => 
      meal.date.startsWith(dateStr) && meal.type === type
    ).reduce((sum, meal) => sum + meal.count, 0);
    return regularMeals + guestMealsCount;
  }, [meals, guestMeals]);

  const useMealSummary = useCallback((startDate: Date, endDate: Date): MealSummary[] => {
    const summaries: MealSummary[] = [];
    let currentDate = startOfDay(startDate);
    
    while (currentDate <= endOfDay(endDate)) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const breakfast = useMealCount(currentDate, 'BREAKFAST');
      const lunch = useMealCount(currentDate, 'LUNCH');
      const dinner = useMealCount(currentDate, 'DINNER');
      
      summaries.push({
        date: dateStr,
        breakfast,
        lunch,
        dinner,
        total: breakfast + lunch + dinner
      });
      
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    
    return summaries;
  }, [useMealCount]);

  const hasMeal = useCallback((date: Date, type: MealType, userId?: string): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetUserId = userId || session?.user?.id;
    
    if (!targetUserId) return false;
    
    return meals.some(meal => 
      meal.date.startsWith(dateStr) && 
      meal.type === type && 
      meal.userId === targetUserId
    );
  }, [meals, session?.user?.id]);

  const canAddMeal = useCallback((date: Date, type: MealType): boolean => {
    if (!mealSettings) return true;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayMeals = meals.filter(meal => 
      meal.date.startsWith(dateStr) && 
      meal.userId === session?.user?.id
    ).length;
    
    return todayMeals < (mealSettings?.maxMealsPerDay || 3);
  }, [mealSettings, meals, session?.user?.id]);

  const isAutoMealTime = useCallback((date: Date, type: MealType): boolean => {
    if (!autoMealSettings?.isEnabled || !mealSettings?.autoMealEnabled) return false;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const mealTime = type === 'BREAKFAST' ? mealSettings.breakfastTime :
                    type === 'LUNCH' ? mealSettings.lunchTime :
                    mealSettings.dinnerTime;
    
    return currentTime === mealTime;
  }, [autoMealSettings, mealSettings]);

  // Get user's guest meals for a specific date
  const getUserGuestMeals = useCallback((date: Date, userId?: string): GuestMeal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetUserId = userId || session?.user?.id;
    
    if (!targetUserId) return [];
    
    return guestMeals.filter(meal => 
      meal.date.startsWith(dateStr) && 
      meal.userId === targetUserId
    );
  }, [guestMeals, session?.user?.id]);

  // Get total guest meals for a user on a specific date
  const getUserGuestMealCount = useCallback((date: Date, userId?: string): number => {
    const userGuestMeals = getUserGuestMeals(date, userId);
    return userGuestMeals.reduce((sum, meal) => sum + meal.count, 0);
  }, [getUserGuestMeals]);

  // Mutation wrappers
  const toggleMeal = useCallback(async (date: Date, type: MealType, userId: string) => {
    await toggleMealMutation.mutateAsync({ date, type, userId });
  }, [toggleMealMutation]);

  const addGuestMeal = useCallback(async (date: Date, type: MealType, count: number) => {
    await addGuestMealMutation.mutateAsync({ date, type, count });
  }, [addGuestMealMutation]);

  const updateGuestMeal = useCallback(async (guestMealId: string, count: number) => {
    await updateGuestMealMutation.mutateAsync({ guestMealId, count });
  }, [updateGuestMealMutation]);

  const deleteGuestMeal = useCallback(async (guestMealId: string) => {
    await deleteGuestMealMutation.mutateAsync(guestMealId);
  }, [deleteGuestMealMutation]);

  const updateMealSettings = useCallback(async (settings: Partial<MealSettings>) => {
    await updateMealSettingsMutation.mutateAsync(settings);
  }, [updateMealSettingsMutation]);

  const updateAutoMealSettings = useCallback(async (settings: Partial<AutoMealSettings>) => {
    await updateAutoMealSettingsMutation.mutateAsync(settings);
  }, [updateAutoMealSettingsMutation]);

  return {
    // Data
    meals,
    guestMeals,
    mealSettings,
    autoMealSettings,
    isLoading: isLoadingMeals || isLoadingGuestMeals || isLoadingSettings || isLoadingAutoSettings,
    error: mealsError || guestMealsError || null,
    
    // Queries
    useMealsByDate,
    useGuestMealsByDate,
    useMealSummary,
    useMealCount,
    
    // Mutations
    toggleMeal,
    addGuestMeal,
    updateGuestMeal,
    deleteGuestMeal,
    
    // Settings
    updateMealSettings,
    updateAutoMealSettings,
    
    // Utilities
    hasMeal,
    canAddMeal,
    isAutoMealTime,
    getUserGuestMeals,
    getUserGuestMealCount,
  };
}

export default useMeal;
