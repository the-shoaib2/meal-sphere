import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { useCurrentPeriod } from '@/hooks/use-periods';

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
  guestMealEnabled: boolean;
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

export interface UserMealStats {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
    month: string;
  };
  totals: {
    regularMeals: number;
    guestMeals: number;
    total: number;
  };
  byType: {
    breakfast: {
      regular: number;
      guest: number;
      total: number;
    };
    lunch: {
      regular: number;
      guest: number;
      total: number;
    };
    dinner: {
      regular: number;
      guest: number;
      total: number;
    };
  };
  daily: Array<{
    date: string;
    breakfast: number;
    lunch: number;
    dinner: number;
    guestBreakfast: number;
    guestLunch: number;
    guestDinner: number;
    total: number;
  }>;
}

interface UseMealReturn {
  // Data
  meals: Meal[];
  guestMeals: GuestMeal[];
  mealSettings: MealSettings | null;
  autoMealSettings: AutoMealSettings | null;
  userMealStats: UserMealStats | null;
  isLoading: boolean;
  isLoadingUserStats: boolean;
  error: Error | null;
  
  // Queries
  useMealsByDate: (date: Date) => Meal[];
  useGuestMealsByDate: (date: Date) => GuestMeal[];
  useMealSummary: (startDate: Date, endDate: Date) => MealSummary[];
  useMealCount: (date: Date, type: MealType) => number;
  useUserMealStats: (month?: string) => UserMealStats | null;
  
  // Mutations
  toggleMeal: (date: Date, type: MealType, userId: string) => Promise<void>;
  addGuestMeal: (date: Date, type: MealType, count: number) => Promise<void>;
  updateGuestMeal: (guestMealId: string, count: number) => Promise<void>;
  deleteGuestMeal: (guestMealId: string) => Promise<void>;
  
  // Settings
  updateMealSettings: (settings: Partial<MealSettings>) => Promise<void>;
  updateAutoMealSettings: (settings: Partial<AutoMealSettings>) => Promise<void>;
  
  // Auto Meal Functions
  triggerAutoMeals: (date: Date) => Promise<void>;
  isAutoMealTime: (date: Date, type: MealType) => boolean;
  shouldAutoAddMeal: (date: Date, type: MealType) => boolean;
  
  // Utilities
  hasMeal: (date: Date, type: MealType, userId?: string) => boolean;
  canAddMeal: (date: Date, type: MealType) => boolean;
  getUserGuestMeals: (date: Date, userId?: string) => GuestMeal[];
  getUserGuestMealCount: (date: Date, userId?: string) => number;
  getUserMealCount: (date: Date, type: MealType, userId?: string) => number;
}

export function useMeal(roomId?: string): UseMealReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: currentPeriod } = useCurrentPeriod();
  
  // Get the most recent period (including ENDED ones) if no active period
  const { data: mostRecentPeriod } = useQuery({
    queryKey: ['mostRecentPeriod', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      
      try {
        // First try to get current (active) period
        const currentResponse = await fetch(`/api/periods/current?groupId=${roomId}`);
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          if (currentData.currentPeriod) {
            return currentData.currentPeriod;
          }
        }
        
        // If no active period, get the most recent period
        const periodsResponse = await fetch(`/api/periods?groupId=${roomId}`);
        if (periodsResponse.ok) {
          const periodsData = await periodsResponse.json();
          if (periodsData.periods && periodsData.periods.length > 0) {
            return periodsData.periods[0]; // Most recent period
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error fetching most recent period:', error);
        return null;
      }
    },
    enabled: !!roomId && !currentPeriod,
  });
  
  // Use current period if available, otherwise use most recent period
  const periodToUse = currentPeriod || mostRecentPeriod;

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
    staleTime: 30 * 60 * 1000, // 30 minutes (was 10)
    refetchOnWindowFocus: false,
    select: (data) => data, // placeholder for shape reduction if needed
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
    staleTime: 30 * 60 * 1000, // 30 minutes (was 10)
    refetchOnWindowFocus: false,
    select: (data) => data, // placeholder for shape reduction if needed
  });

  // Prefetch related queries example (call in a useEffect in component):
  // useEffect(() => {
  //   if (roomId) {
  //     queryClient.prefetchQuery(['meals', roomId]);
  //     queryClient.prefetchQuery(['guest-meals', roomId]);
  //   }
  // }, [roomId]);

  // Fetch user meal statistics
  const { data: userMealStats = null, isLoading: isLoadingUserStats } = useQuery<UserMealStats | null>({
    queryKey: ['user-meal-stats', roomId, session?.user?.id, periodToUse?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return null;
      
      // Only make the API call if we have a period
      if (!periodToUse?.id) {
        console.log('No period available, returning null for user stats');
        return null;
      }
      
      const params = new URLSearchParams({
        roomId,
        userId: session.user.id,
        periodId: periodToUse.id
      });
      
      console.log('Using period for stats:', periodToUse.name, periodToUse.id, 'Status:', periodToUse.status);
      
      const { data } = await axios.get<UserMealStats>(`/api/meals/user-stats?${params.toString()}`);
      return data;
    },
    enabled: !!roomId && !!session?.user?.id && !!periodToUse?.id,
    staleTime: 5 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: ['user-meal-stats', roomId, session?.user?.id, periodToUse?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['user-meal-stats', roomId, session?.user?.id, periodToUse?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['user-meal-stats', roomId, session?.user?.id, periodToUse?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['user-meal-stats', roomId, session?.user?.id, periodToUse?.id] });
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

  // Trigger auto meals mutation
  const triggerAutoMealsMutation = useMutation({
    mutationFn: async (date: Date) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      await axios.post('/api/meals/auto-process', {
        roomId,
        date: formattedDate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', roomId] });
      queryClient.invalidateQueries({ queryKey: ['meal-summary', roomId] });
      toast.success('Auto meals processed successfully');
    },
    onError: (error: any) => {
      console.error('Error triggering auto meals:', error);
      toast.error(error.response?.data?.message || 'Failed to trigger auto meals');
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
    
    // Check if user has reached daily meal limit
    if (todayMeals >= (mealSettings?.maxMealsPerDay || 3)) {
      return false;
    }
    
    // Check if meal time has passed for the specific date
    const now = new Date();
    const targetDate = new Date(date);
    
    // Get meal time for the specific type
    let mealTimeStr = '';
    if (type === 'BREAKFAST') mealTimeStr = mealSettings.breakfastTime || '08:00';
    if (type === 'LUNCH') mealTimeStr = mealSettings.lunchTime || '13:00';
    if (type === 'DINNER') mealTimeStr = mealSettings.dinnerTime || '20:00';
    
    // Parse meal time
    const [hours, minutes] = mealTimeStr.split(':').map(Number);
    const mealTime = new Date(targetDate);
    mealTime.setHours(hours, minutes, 0, 0);
    
    // If the target date is today, check if meal time has passed
    if (isSameDay(targetDate, now)) {
      return now < mealTime;
    }
    
    // For future dates, always allow
    if (targetDate > now) {
      return true;
    }
    
    // For past dates, don't allow
    return false;
  }, [mealSettings, meals, session?.user?.id]);

  const isAutoMealTime = useCallback((date: Date, type: MealType): boolean => {
    // Check if auto meal system is enabled by admin
    if (!mealSettings?.autoMealEnabled) return false;
    
    // Check if user has auto meals enabled
    if (!autoMealSettings?.isEnabled) return false;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const mealTime = type === 'BREAKFAST' ? mealSettings.breakfastTime :
                    type === 'LUNCH' ? mealSettings.lunchTime :
                    mealSettings.dinnerTime;
    
    return currentTime === mealTime;
  }, [autoMealSettings, mealSettings]);

  const shouldAutoAddMeal = useCallback((date: Date, type: MealType): boolean => {
    // Check if auto meal system is enabled by admin
    if (!mealSettings?.autoMealEnabled) return false;
    
    // Check if user has auto meals enabled
    if (!autoMealSettings?.isEnabled) return false;
    
    // Check if this meal type is enabled for the user
    const isEnabled = type === 'BREAKFAST' ? autoMealSettings.breakfastEnabled :
                     type === 'LUNCH' ? autoMealSettings.lunchEnabled :
                     autoMealSettings.dinnerEnabled;
    
    if (!isEnabled) return false;
    
    // Check if this meal type is excluded
    if (autoMealSettings.excludedMealTypes.includes(type)) return false;
    
    // Check if the date is excluded
    const dateStr = format(date, 'yyyy-MM-dd');
    if (autoMealSettings.excludedDates.includes(dateStr)) return false;
    
    // Check if user already has this meal
    if (hasMeal(date, type)) return false;
    
    // Check if it's the right time
    return isAutoMealTime(date, type);
  }, [autoMealSettings, mealSettings, hasMeal, isAutoMealTime]);

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

  // Get user's meal count for a specific date and type
  const getUserMealCount = useCallback((date: Date, type: MealType, userId?: string): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetUserId = userId || session?.user?.id;
    
    if (!targetUserId) return 0;
    
    const regularMeals = meals.filter(meal => 
      meal.date.startsWith(dateStr) && 
      meal.type === type && 
      meal.userId === targetUserId
    ).length;
    
    const guestMealsCount = guestMeals.filter(meal => 
      meal.date.startsWith(dateStr) && 
      meal.type === type && 
      meal.userId === targetUserId
    ).reduce((sum, meal) => sum + meal.count, 0);
    
    return regularMeals + guestMealsCount;
  }, [meals, guestMeals, session?.user?.id]);

  // Get user meal stats for a specific month
  const useUserMealStats = useCallback((month?: string): UserMealStats | null => {
    if (!userMealStats) return null;
    
    // If no month specified, return current stats
    if (!month) return userMealStats;
    
    // For now, return current stats. In the future, we could implement month-specific fetching
    return userMealStats;
  }, [userMealStats]);

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

  const triggerAutoMeals = useCallback(async (date: Date) => {
    await triggerAutoMealsMutation.mutateAsync(date);
  }, [triggerAutoMealsMutation]);

  return {
    // Data
    meals,
    guestMeals,
    mealSettings,
    autoMealSettings,
    userMealStats,
    isLoading: isLoadingMeals || isLoadingGuestMeals || isLoadingSettings || isLoadingAutoSettings || isLoadingUserStats,
    isLoadingUserStats,
    error: mealsError || guestMealsError || null,
    
    // Queries
    useMealsByDate,
    useGuestMealsByDate,
    useMealSummary,
    useMealCount,
    useUserMealStats,
    
    // Mutations
    toggleMeal,
    addGuestMeal,
    updateGuestMeal,
    deleteGuestMeal,
    
    // Settings
    updateMealSettings,
    updateAutoMealSettings,
    
    // Auto Meal Functions
    triggerAutoMeals,
    isAutoMealTime,
    shouldAutoAddMeal,
    
    // Utilities
    hasMeal,
    canAddMeal,
    getUserGuestMeals,
    getUserGuestMealCount,
    getUserMealCount,
  };
}

export default useMeal;
