import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { 
  fetchMealsData,
  toggleMeal as toggleMealAction, 
  patchGuestMeal as patchGuestMealAction, 
  deleteGuestMeal as deleteGuestMealAction, 
  updateMealSettings as updateMealSettingsAction, 
  updateAutoMealSettings as updateAutoMealSettingsAction, 
  triggerAutoMeals as triggerAutoMealsAction 
} from '@/lib/services/meals-service';

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
  timestamp?: string;
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
  isTogglingMeal: boolean;
  isPatchingGuestMeal: boolean;
  isDeletingGuestMeal: boolean;
  error: Error | null;

  // Queries
  useMealsByDate: (date: Date) => Meal[];
  useGuestMealsByDate: (date: Date) => GuestMeal[];
  useMealSummary: (startDate: Date, endDate: Date) => MealSummary[];
  useMealCount: (date: Date, type: MealType) => number;
  useUserMealStats: (month?: string) => UserMealStats | null;

  // Mutations
  toggleMeal: (date: Date, type: MealType, userId: string) => Promise<void>;
  patchGuestMeal: (date: Date, type: MealType, count: number) => Promise<void>;
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

export function useMeal(roomId?: string, selectedDate?: Date, initialData?: MealsPageData, userRoleFromProps?: string | null, forceRefetch?: boolean): UseMealReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: currentPeriodFromHook } = useCurrentPeriod();

  // Priority: 1. Passed initialData, 2. Server-side currentPeriod
  // Accept initialData if it has a matching groupId OR if groupId is missing (older format)
  const effectiveInitialData = initialData && (!initialData.groupId || initialData.groupId === roomId) ? initialData : null;

  // The month key (yyyy-MM) used to cache entire periods in React Query.
  // This enables instant navigation between days in the same period/month.
  const monthKey = selectedDate ? format(selectedDate, 'yyyy-MM') : null;
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  // 1. Fetch Meals and Period for the selected date via GET /api/meals
  //    - initialData from SSR seeds the cache instantly on first render
  //    - Subsequent date changes trigger a real network fetch
  const { data: mealSystem = { meals: [], guestMeals: [], period: null }, isLoading: isLoadingMeals } = useQuery<{ meals: Meal[], guestMeals: GuestMeal[], period: any }>({
    queryKey: ['meals-system', roomId, monthKey],
    queryFn: async () => {
      if (!roomId || !selectedDateStr) return { meals: [], guestMeals: [], period: null };
      const res = await fetchMealsData(session?.user?.id as string, roomId, { date: new Date(selectedDateStr) });
      return { meals: res.meals, period: res.currentPeriod, guestMeals: res.guestMeals };
    },
    enabled: !!roomId && !!monthKey,
    initialData: effectiveInitialData
      ? { 
          meals: effectiveInitialData.meals || [], 
          guestMeals: effectiveInitialData.guestMeals || [],
          period: effectiveInitialData.currentPeriod || null 
        }
      : undefined,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: forceRefetch ? 0 : 5 * 60 * 1000,
    refetchOnMount: forceRefetch ? 'always' : true,
    refetchOnWindowFocus: false
  });


  const meals = mealSystem?.meals || [];
  const guestMeals = mealSystem?.guestMeals || [];
  const targetPeriod = mealSystem?.period || null;

  // 2. Fetch Meal Settings
  const { data: mealSettings = null, isLoading: isLoadingSettings } = useQuery<MealSettings | null>({
    queryKey: ['meal-settings', roomId],
    queryFn: async () => {
      return null;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.settings || effectiveInitialData?.mealSettings,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // 4. Fetch Auto Meal Settings
  const { data: autoMealSettings = null, isLoading: isLoadingAutoSettings } = useQuery<AutoMealSettings | null>({
    queryKey: ['auto-meal-settings', roomId, session?.user?.id],
    queryFn: async () => {
      return null;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.autoSettings || effectiveInitialData?.autoMealSettings,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // 5. Fetch User Meal Stats
  const { data: userMealStats = null, isLoading: isLoadingUserStats } = useQuery<UserMealStats | null>({
    queryKey: ['user-meal-stats', roomId, session?.user?.id],
    queryFn: async () => {
      return null;
    },
    enabled: false, // Disabled - rely on SSR
    initialData: effectiveInitialData?.userStats || effectiveInitialData?.userMealStats,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });


  const currentPeriod = targetPeriod || currentPeriodFromHook || effectiveInitialData?.currentPeriod;
  const userRole = userRoleFromProps || effectiveInitialData?.userRole || null;

  // Consolidated loading state
  const isLoading = isLoadingMeals || isLoadingSettings || isLoadingAutoSettings || isLoadingUserStats;

  // Toggle meal mutation
  const toggleMealMutation = useMutation({
    mutationFn: async ({ date, type, userId, action }: { date: Date; type: MealType; userId: string; action: 'add' | 'remove' }) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const res = await toggleMealAction(roomId!, userId, formattedDate, type, action, currentPeriod?.id);
      return { meal: res && typeof res === 'object' ? res : null, success: !!res }; // Return the new meal directly
    },
    onMutate: async (variables) => {
      const { date, type, userId } = variables;
      const dateString = format(date, 'yyyy-MM-dd');

      // Target the specific query for the current view
      // We use monthKey to ensure we update the period-wide cache
      const queryKey = ['meals-system', roomId, monthKey];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: { meals: Meal[], period: any } | undefined) => {
        if (!old) return old;

        const dateOnly = dateString.split('T')[0];
        const existingMealIndex = old.meals.findIndex(
          m => {
            const mDateStr = m && (m as any).date instanceof Date ? ((m as any).date as Date).toISOString() : (typeof (m as any).date === 'string' ? (m as any).date : '');
            return (mDateStr.startsWith(dateOnly)) && m.type === type && m.userId === userId;
          }
        );

        let newMeals = [...old.meals];

        if (existingMealIndex >= 0) {
          // Remove meal (toggle off)
          newMeals = newMeals.filter((_, i) => i !== existingMealIndex);
        } else {
          // Add meal (toggle on)
          const newMeal: Meal = {
            id: `temp-${type}-${dateOnly}-${Date.now()}`,
            date: dateString,
            type,
            userId,
            roomId: roomId!,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: {
              id: userId,
              name: session?.user?.name || null,
              image: session?.user?.image || null,
              email: session?.user?.email || null,
            } as any
          };
          newMeals = [newMeal, ...newMeals];
        }

        return {
          ...old,
          meals: newMeals
        };
      });

      return { previousData };
    },
    onError: (error: any, variables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['meals-system', roomId, monthKey], context.previousData);
      }
      console.error('Error toggling meal:', error);
      toast.error(error.response?.data?.message || 'Failed to update meal');
    },
    onSuccess: (data: any, variables) => {
      const { action, type, date } = variables;
      const dateString = format(date, 'yyyy-MM-dd');
      const queryKey = ['meals-system', roomId, monthKey];
      
      if (action === 'add' && data.meal) {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          
          const updatedMeals = old.meals.map((m: any) => {
            const mDateStr = m.date instanceof Date ? m.date.toISOString() : (typeof m.date === 'string' ? m.date : '');
            if (m.id.startsWith('temp-') && m.type === type && mDateStr.startsWith(dateString)) {
              return data.meal;
            }
            return m;
          });

          return {
            ...old,
            meals: updatedMeals
          };
        });
      }
    },
  });

  // Consolidated guest meal mutation for add and update
  const patchGuestMealMutation = useMutation({
    mutationFn: async ({ date, type, count }: { date: Date; type: MealType; count: number }) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const res = await patchGuestMealAction({ 
        roomId: roomId!, 
        userId: session?.user?.id as string, 
        dateStr: formattedDate, 
        type, 
        count, 
        periodId: currentPeriod?.id 
      });
      
      if (res.error) throw new Error(res.error);
      const meal = res.data!;
      return {
        ...meal,
        date: meal.date.toISOString(),
        createdAt: meal.createdAt.toISOString(),
        updatedAt: meal.updatedAt.toISOString(),
      } as unknown as GuestMeal;
    },
    onMutate: async (variables) => {
      const { date, type, count } = variables;
      const queryKey = ['meals-system', roomId, monthKey];
      
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any | undefined) => {
        if (!old) return old;
        
        const dateStr = format(date, 'yyyy-MM-dd');
        const existingMealIndex = (old.guestMeals || []).findIndex(
          (m: any) => m.type === type && m.date.startsWith(dateStr) && m.userId === session?.user?.id
        );

        let newGuestMeals = [...(old.guestMeals || [])];

        if (existingMealIndex >= 0) {
          // Update existing
          newGuestMeals[existingMealIndex] = { ...newGuestMeals[existingMealIndex], count };
        } else {
          // Add new temp
          const newGuestMeal: GuestMeal = {
            id: `temp-${Date.now()}`,
            date: dateStr,
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
          newGuestMeals = [newGuestMeal, ...newGuestMeals];
        }

        return { ...old, guestMeals: newGuestMeals };
      });
      
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['meals-system', roomId, monthKey], context.previousData);
      }
      toast.error(error.message || 'Failed to update guest meal');
    },
    onSuccess: (data: GuestMeal) => {
      queryClient.setQueryData(['meals-system', roomId, monthKey], (old: any | undefined) => {
        if (!old) return old;
        const dateStr = data.date.split('T')[0];
        const withoutMatching = (old.guestMeals || []).filter(
          (m: any) => !(m.type === data.type && m.date.startsWith(dateStr) && m.userId === data.userId) && !m.id.startsWith('temp-')
        );
        return {
          ...old,
          guestMeals: [data, ...withoutMatching]
        };
      });
    },
  });

  // Delete guest meal mutation
  const deleteGuestMealMutation = useMutation({
    mutationFn: async (guestMealId: string) => {
      return await deleteGuestMealAction(guestMealId, session?.user?.id as string, currentPeriod?.id);
    },
    onMutate: async (guestMealId) => {
      const queryKey = ['meals-system', roomId, monthKey];
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically remove guest meal
      queryClient.setQueryData(queryKey, (old: any | undefined) => {
        if (!old) return old;
        return {
          ...old,
          guestMeals: (old.guestMeals || []).filter((meal: any) => meal.id !== guestMealId)
        };
      });
      
      return { previousData };
    },
    onError: (error: any, guestMealId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['meals-system', roomId, monthKey], context.previousData);
      }
      console.error('Error deleting guest meal:', error);
      toast.error(error.response?.data?.message || 'Failed to delete guest meal');
    },
    onSuccess: (_, guestMealId) => {
      queryClient.setQueryData(['meals-system', roomId, monthKey], (old: any | undefined) => {
        if (!old) return old;
        return {
          ...old,
          guestMeals: (old.guestMeals || []).filter((meal: any) => meal.id !== guestMealId)
        };
      });
    },
  });

  // Update meal settings mutation
  const updateMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<MealSettings>) => {
      const res = await updateMealSettingsAction(roomId!, settings);
      return {
        ...res,
        createdAt: res.createdAt.toISOString(),
        updatedAt: res.updatedAt.toISOString(),
      } as unknown as MealSettings;
    },
    onSuccess: (data: MealSettings) => {
      queryClient.setQueryData(['meal-settings', roomId], data);
      // toast.success('Meal settings updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating meal settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update meal settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-settings', roomId] });
    }
  });

  // Update auto meal settings mutation
  const updateAutoMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AutoMealSettings>) => {
      const res = await updateAutoMealSettingsAction(roomId!, session?.user?.id as string, settings);
      return {
        ...res,
        startDate: res.startDate.toISOString(),
        endDate: res.endDate ? res.endDate.toISOString() : undefined,
        createdAt: res.createdAt.toISOString(),
        updatedAt: res.updatedAt.toISOString(),
      } as unknown as AutoMealSettings;
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
      toast.error((err as any).response?.data?.message || 'Failed to update auto meal settings');
    },
    onSuccess: (data: AutoMealSettings) => {
      queryClient.setQueryData(['auto-meal-settings', roomId, session?.user?.id], data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-meal-settings', roomId, session?.user?.id] });
    }
  });

  // Trigger auto meals mutation
  const triggerAutoMealsMutation = useMutation({
    mutationFn: async (date: Date) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const res = await triggerAutoMealsAction(roomId!, formattedDate);
      return res;
    },
    onSuccess: (data: any) => {
      // For auto meals, we don't know exactly what changed, but if we have no GET API,
      // we might need the server to return the updated meals list.
      // Assuming for now it's a bulk action.
      toast.success('Auto meals processed successfully');
    },
    onError: (error: any) => {
      console.error('Error triggering auto meals:', error);
      toast.error(error.response?.data?.message || 'Failed to trigger auto meals');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, selectedDateStr] });
    }
  });

  // Utility functions: Filter the period-wide data locally for instant UI updates
  const useMealsByDate = useCallback((date: Date): Meal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (meals as Meal[]).filter(meal => ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr));
  }, [meals]);

  const useGuestMealsByDate = useCallback((date: Date): GuestMeal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (guestMeals as GuestMeal[]).filter(meal => ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr));
  }, [guestMeals]);

  const useMealCount = useCallback((date: Date, type: MealType): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const regularMeals = (meals || []).filter((meal: Meal) =>
      ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr) && meal.type === type
    ).length;
    const guestMealsCount = (guestMeals || []).filter((meal: GuestMeal) =>
      ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr) && meal.type === type
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
      (((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr)) &&
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

    // BYPASS: Admins, Managers, and Meal Managers can skip other checks (limits, past/future dates, time restrictions)
    if (isPrivileged) return true;

    // RESTRICTED: For today, check meal time cutoff for regular members
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

      // If time passed, member cannot add/toggle today
      if (now >= mealTime) {
        return false;
      }
    }

    if (!mealSettings) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    const todayMeals = meals.filter((meal: Meal) =>
      ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr) &&
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
      ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr) &&
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
      ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr) &&
      meal.type === type &&
      meal.userId === targetUserId
    ).length;

    const guestMealsCount = guestMeals.filter((meal: GuestMeal) =>
      ((meal?.date as any) instanceof Date ? ((meal.date as any) as Date).toISOString() : (typeof meal?.date === 'string' ? meal.date : '')).startsWith(dateStr) &&
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
    const exists = hasMeal(date, type, userId);
    const action = exists ? 'remove' : 'add';
    await toggleMealMutation.mutateAsync({ date, type, userId, action });
  }, [toggleMealMutation, hasMeal]);

  const patchGuestMeal = useCallback(async (date: Date, type: MealType, count: number) => {
    await patchGuestMealMutation.mutateAsync({ date, type, count });
  }, [patchGuestMealMutation]);

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
    isLoading: isLoadingMeals || isLoadingSettings || isLoadingAutoSettings || isLoadingUserStats,
    isLoadingUserStats,
    isTogglingMeal: toggleMealMutation.isPending,
    isPatchingGuestMeal: patchGuestMealMutation.isPending,
    isDeletingGuestMeal: deleteGuestMealMutation.isPending,
    error: null,

    // Queries
    useMealsByDate,
    useGuestMealsByDate,
    useMealSummary,
    useMealCount,
    useUserMealStats,

    // Mutations
    toggleMeal,
    patchGuestMeal,
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
