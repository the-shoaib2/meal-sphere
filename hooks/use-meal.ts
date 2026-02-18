import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

export interface MealsPageData {
  meals: Meal[];
  guestMeals: GuestMeal[];
  settings: MealSettings | null;
  mealSettings?: MealSettings | null; 
  autoSettings: AutoMealSettings | null;
  autoMealSettings?: AutoMealSettings | null; 
  userStats: any;
  userMealStats?: any; 
  currentPeriod: any;
  roomData: any;
  userRole: string | null;
  groupId?: string;
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
  currentPeriod: any;
}

export function useMeal(roomId?: string, selectedDate?: Date, initialData?: MealsPageData, userRoleFromProps?: string | null): UseMealReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: currentPeriodFromHook } = useCurrentPeriod();

  // Priority: 1. Passed initialData, 2. Server-side currentPeriod
  const effectiveInitialData = initialData && initialData.groupId === roomId ? initialData : null;

  // 1. Fetch Meals and Period for the selected date
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const { data: mealSystem = { meals: [], period: null }, isLoading: isLoadingMeals } = useQuery<{ meals: Meal[], period: any }>({
    queryKey: ['meals-system', roomId, selectedDateStr],
    queryFn: async () => {
      if (!roomId) return { meals: [], period: null };
      const url = selectedDateStr 
        ? `/api/meals?roomId=${roomId}&date=${selectedDateStr}`
        : `/api/meals?roomId=${roomId}`;
      const res = await axios.get(url);
      return res.data;
    },
    enabled: !!roomId,
    initialData: selectedDateStr === format(new Date(), 'yyyy-MM-dd') || !selectedDateStr
      ? { 
          meals: effectiveInitialData?.meals || [], 
          period: effectiveInitialData?.currentPeriod || null 
        }
      : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false
  });

  const meals = mealSystem?.meals || [];
  const targetPeriod = mealSystem?.period || null;

  // 2. Fetch Guest Meals
  const { data: guestMeals = [], isLoading: isLoadingGuestMeals, error: guestMealsError } = useQuery<GuestMeal[]>({
    queryKey: ['guest-meals', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      const res = await axios.get(`/api/meals/guest?roomId=${roomId}`);
      return res.data;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.guestMeals,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // 3. Fetch Meal Settings
  const { data: mealSettings = null, isLoading: isLoadingSettings } = useQuery<MealSettings | null>({
    queryKey: ['meal-settings', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const res = await axios.get(`/api/meals/settings?roomId=${roomId}`);
      return res.data;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.settings || effectiveInitialData?.mealSettings,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // 4. Fetch Auto Meal Settings
  const { data: autoMealSettings = null, isLoading: isLoadingAutoSettings } = useQuery<AutoMealSettings | null>({
    queryKey: ['auto-meal-settings', roomId, session?.user?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return null;
      const res = await axios.get(`/api/meals/auto-settings?roomId=${roomId}&userId=${session.user.id}`);
      return res.data;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.autoSettings || effectiveInitialData?.autoMealSettings,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // 5. Fetch User Meal Stats
  const { data: userMealStats = null, isLoading: isLoadingUserStats } = useQuery<UserMealStats | null>({
    queryKey: ['user-meal-stats', roomId, session?.user?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return null;
      const res = await axios.get(`/api/meals/user-stats?roomId=${roomId}&userId=${session.user.id}`);
      return res.data;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.userStats || effectiveInitialData?.userMealStats,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  const currentPeriod = targetPeriod || currentPeriodFromHook || effectiveInitialData?.currentPeriod;
  const userRole = userRoleFromProps || effectiveInitialData?.userRole || null;

  // Consolidated loading state
  const isLoading = isLoadingMeals || isLoadingGuestMeals || isLoadingSettings || isLoadingAutoSettings || isLoadingUserStats;

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
    onMutate: async (variables) => {
      const { date, type, userId } = variables;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['meals', roomId] });
      
      // Snapshot previous value
      const previousMeals = queryClient.getQueryData(['meals', roomId]);
      
      // Optimistically update
      queryClient.setQueryData(['meals', roomId], (old: Meal[] | undefined) => {
        if (!old) return old;
        
        const dateStr = format(date, 'yyyy-MM-dd');
        const existingMealIndex = old.findIndex(
          m => m.date.startsWith(dateStr) && m.type === type && m.userId === userId
        );
        
        if (existingMealIndex >= 0) {
          // Remove meal (toggle off)
          return old.filter((_, i) => i !== existingMealIndex);
        } else {
          // Add meal (toggle on)
          const newMeal: Meal = {
            id: `temp-${Date.now()}`,
            date: dateStr,
            type,
            userId,
            roomId: roomId!,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: {
              id: userId,
              name: session?.user?.name || null,
              image: session?.user?.image || null,
            }
          };
          return [newMeal, ...old];
        }
      });
      
      return { previousMeals };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(['meals', roomId], context.previousMeals);
      }
      console.error('Error toggling meal:', error);
      toast.error(error.response?.data?.message || 'Failed to update meal');
    },
    onSuccess: () => {
      // Sync with SSR
      router.refresh();
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
    onMutate: async (variables) => {
      const { date, type, count } = variables;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['guest-meals', roomId] });
      
      // Snapshot previous value
      const previousGuestMeals = queryClient.getQueryData(['guest-meals', roomId]);
      
      // Optimistically add guest meal
      queryClient.setQueryData(['guest-meals', roomId], (old: GuestMeal[] | undefined) => {
        if (!old) return old;
        
        const newGuestMeal: GuestMeal = {
          id: `temp-${Date.now()}`,
          date: format(date, 'yyyy-MM-dd'),
          type,
          count,
          userId: session?.user?.id!,
          roomId: roomId!,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: session?.user?.id!,
            name: session?.user?.name || null,
            image: session?.user?.image || null,
          }
        };
        return [newGuestMeal, ...old];
      });
      
      return { previousGuestMeals };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousGuestMeals) {
        queryClient.setQueryData(['guest-meals', roomId], context.previousGuestMeals);
      }
      console.error('Error adding guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to add guest meal');
    },
    onSuccess: (_, variables) => {
      router.refresh();
      toast.success(`Added ${variables.count} guest meal(s) successfully`);
    }
  });

  // Update guest meal mutation
  const updateGuestMealMutation = useMutation({
    mutationFn: async ({ guestMealId, count }: { guestMealId: string; count: number }) => {
      await axios.patch(`/api/meals/guest/${guestMealId}`, { count });
    },
    onMutate: async (variables) => {
      const { guestMealId, count } = variables;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['guest-meals', roomId] });
      
      // Snapshot previous value
      const previousGuestMeals = queryClient.getQueryData(['guest-meals', roomId]);
      
      // Optimistically update count
      queryClient.setQueryData(['guest-meals', roomId], (old: GuestMeal[] | undefined) => {
        if (!old) return old;
        return old.map(meal => 
          meal.id === guestMealId ? { ...meal, count } : meal
        );
      });
      
      return { previousGuestMeals };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousGuestMeals) {
        queryClient.setQueryData(['guest-meals', roomId], context.previousGuestMeals);
      }
      console.error('Error updating guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to update guest meal');
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Guest meal updated successfully');
    }
  });

  // Delete guest meal mutation
  const deleteGuestMealMutation = useMutation({
    mutationFn: async (guestMealId: string) => {
      await axios.delete(`/api/meals/guest/${guestMealId}`);
    },
    onMutate: async (guestMealId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['guest-meals', roomId] });
      
      // Snapshot previous value
      const previousGuestMeals = queryClient.getQueryData(['guest-meals', roomId]);
      
      // Optimistically remove guest meal
      queryClient.setQueryData(['guest-meals', roomId], (old: GuestMeal[] | undefined) => {
        if (!old) return old;
        return old.filter(meal => meal.id !== guestMealId);
      });
      
      return { previousGuestMeals };
    },
    onError: (error: any, guestMealId, context) => {
      // Rollback on error
      if (context?.previousGuestMeals) {
        queryClient.setQueryData(['guest-meals', roomId], context.previousGuestMeals);
      }
      console.error('Error deleting guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to delete guest meal');
    },
    onSuccess: () => {
      router.refresh();
      toast.success('Guest meal deleted successfully');
    }
  });

  // Update meal settings mutation
  const updateMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<MealSettings>) => {
      await axios.patch(`/api/meals/settings?roomId=${roomId}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-settings', roomId] });
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
    onMutate: async (newSettings) => {
      const previousData = queryClient.getQueryData(['auto-meal-settings', roomId, session?.user?.id]);

      queryClient.setQueryData(['auto-meal-settings', roomId, session?.user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          ...newSettings
        };
      });

      return { previousData };
    },
    onError: (err, newSettings, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['auto-meal-settings', roomId, session?.user?.id], context.previousData);
      }
      console.error('Error updating auto meal settings:', err);
      toast.error('Failed to update auto meal settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-meal-settings', roomId, session?.user?.id] });
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
    const regularMeals = meals.filter((meal: Meal) =>
      meal.date.startsWith(dateStr) && meal.type === type
    ).length;
    const guestMealsCount = guestMeals.filter((meal: GuestMeal) =>
      meal.date.startsWith(dateStr) && meal.type === type
    ).reduce((sum: number, meal: GuestMeal) => sum + meal.count, 0);
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

    return meals.some((meal: Meal) =>
      meal.date.startsWith(dateStr) &&
      meal.type === type &&
      meal.userId === targetUserId
    );
  }, [meals, session?.user?.id]);

  const canAddMeal = useCallback((date: Date, type: MealType): boolean => {
    const isPrivileged = userRole && ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(userRole);
    const now = new Date();
    const targetDate = new Date(date);
    const isToday = isSameDay(targetDate, now);
    const isPast = !isToday && targetDate < now;

    // Check if period is locked
    const { isPeriodLocked } = require('@/lib/utils/period-utils-shared');
    if (isPeriodLocked(currentPeriod)) return false;

    // RESTRICTED: For today, always enforce individual meal time cutoff for EVERYONE (including Admins)
    if (isToday) {
      if (!mealSettings) return true;

      // Get meal time for the specific type
      let mealTimeStr = '';
      if (type === 'BREAKFAST') mealTimeStr = mealSettings.breakfastTime || '08:00';
      if (type === 'LUNCH') mealTimeStr = mealSettings.lunchTime || '13:00';
      if (type === 'DINNER') mealTimeStr = mealSettings.dinnerTime || '20:00';

      // Parse meal time
      const [hours, minutes] = mealTimeStr.split(':').map(Number);
      const mealTime = new Date(targetDate);
      mealTime.setHours(hours, minutes, 0, 0);

      // If time passed, no one can add/toggle today
      if (now >= mealTime) {
        return false;
      }
    }

    // BYPASS: Admins, Managers, and Meal Managers can skip other checks (limits, past/future dates)
    if (isPrivileged) return true;

    if (!mealSettings) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    const todayMeals = meals.filter((meal: Meal) =>
      meal.date.startsWith(dateStr) &&
      meal.userId === session?.user?.id
    ).length;

    // Check if user has reached daily meal limit
    if (todayMeals >= (mealSettings?.maxMealsPerDay || 3)) {
      return false;
    }

    // For all other cases (past or future dates), allow adding meals
    // This supports "always meal add button enable" for history and future.
    return true;
  }, [mealSettings, meals, session?.user?.id, userRole]);

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

    return guestMeals.filter((meal: GuestMeal) =>
      meal.date.startsWith(dateStr) &&
      meal.userId === targetUserId
    );
  }, [guestMeals, session?.user?.id]);

  // Get total guest meals for a user on a specific date
  const getUserGuestMealCount = useCallback((date: Date, userId?: string): number => {
    const userGuestMeals = getUserGuestMeals(date, userId);
    return userGuestMeals.reduce((sum: number, meal: GuestMeal) => sum + meal.count, 0);
  }, [getUserGuestMeals]);

  // Get user's meal count for a specific date and type
  const getUserMealCount = useCallback((date: Date, type: MealType, userId?: string): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) return 0;

    const regularMeals = meals.filter((meal: Meal) =>
      meal.date.startsWith(dateStr) &&
      meal.type === type &&
      meal.userId === targetUserId
    ).length;

    const guestMealsCount = guestMeals.filter((meal: GuestMeal) =>
      meal.date.startsWith(dateStr) &&
      meal.type === type &&
      meal.userId === targetUserId
    ).reduce((sum: number, meal: GuestMeal) => sum + meal.count, 0);

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
    error: guestMealsError || null,

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
    currentPeriod: targetPeriod || currentPeriodFromHook || effectiveInitialData?.currentPeriod
  };
}

export default useMeal;
