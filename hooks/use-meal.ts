import { useCallback, useRef, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { 
  fetchMealsData,
  toggleMeal as toggleMealAction, 
  addGuestMeal as patchGuestMealAction, 
  deleteGuestMeal as deleteGuestMealAction, 
  updateMealSettings as updateMealSettingsAction, 
  updateAutoMealSettings as updateAutoMealSettingsAction, 
  triggerAutoMeals as triggerAutoMealsAction,
  fetchMealSettings,
  fetchAutoMealSettings,
  fetchUserMealStats
} from '@/lib/services/meals-service';

import { toast } from 'react-hot-toast';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { useCurrentPeriod } from '@/hooks/use-periods';
import { 
  isPeriodLocked, 
  canUserEditMeal, 
  formatDateSafe, 
  parseDateSafe 
} from '@/lib/utils/period-utils-shared';

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
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  period?: {
    startDate: string;
    endDate: string;
    month: string;
  };
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

const normalizeDateStr = (dateVal: any): string => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) return dateVal.toISOString();
  if (typeof dateVal === 'string') return dateVal;
  return String(dateVal);
};

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
  addGuestMeal: (date: Date, type: MealType, count: number) => Promise<void>;
  deleteGuestMeal: (guestMealId: string, date?: Date) => Promise<void>;

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
  canEditGuestMeal: (date: Date, type: MealType) => boolean;
  getUserGuestMeals: (date: Date, userId?: string) => GuestMeal[];
  getUserGuestMealCount: (date: Date, type: MealType, userId?: string) => number;
  getUserMealCount: (date: Date, type: MealType, userId?: string) => number;
  userRole: string | null;
  currentPeriod: any;
  optimisticToggles: Record<string, 'add' | 'remove' | null>;
}

export function useMeal(roomId?: string, selectedDate?: Date, initialData?: MealsPageData, userRoleFromProps?: string | null, forceRefetch?: boolean): UseMealReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: currentPeriodFromHook } = useCurrentPeriod();

  // 0. Optimistic State for debouncing
  // Key format: `${dateStr}-${type}-${userId}`
  const [optimisticToggles, setOptimisticToggles] = useState<Record<string, 'add' | 'remove' | null>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Priority: 1. Passed initialData, 2. Server-side currentPeriod
  // Accept initialData if it has a matching groupId OR if groupId is missing (older format)
  const effectiveInitialData = initialData && (!initialData.groupId || initialData.groupId === roomId) ? initialData : null;

  // The month key (yyyy-MM) used to cache entire periods in React Query.
  // This enables instant navigation between days in the same period/month.
  const monthKey = selectedDate ? format(selectedDate, 'yyyy-MM') : null;
  const selectedDateStr = selectedDate ? formatDateSafe(selectedDate) : null;

  const dateRef = useRef(selectedDateStr);
  useEffect(() => {
    dateRef.current = selectedDateStr;
  }, [selectedDateStr]);

  // 1. Fetch Meals and Period for the selected date via GET /api/meals
  //    - initialData from SSR seeds the cache instantly on first render
  //    - Subsequent date changes trigger a real network fetch
  // We use periodId in the key to ensure different periods in the same month don't collide,
  // but we fallback to monthKey for initial seeding to restore "dots" visibility.
  const periodIdInCache = effectiveInitialData?.currentPeriod?.id || initialData?.currentPeriod?.id || 'current';
  
  // 1a. Fetch meals + guest meals + period (requires a selected date)
  const { data: mealSystem = { meals: [], guestMeals: [], period: null }, isLoading: isLoadingMeals } = useQuery<{ meals: Meal[], guestMeals: GuestMeal[], period: any }>({
    queryKey: ['meals-system', roomId, monthKey, periodIdInCache],
    queryFn: async ({ queryKey }) => {
      const [_key, _roomId, _monthKey] = queryKey as [string, string, string];
      if (!_roomId || !selectedDate) return { meals: [], guestMeals: [], period: null };
      const res = await fetchMealsData(session?.user?.id as string, _roomId, { date: selectedDate });
      return {
        meals: res.meals,
        period: res.currentPeriod,
        guestMeals: res.guestMeals,
      };
    },
    enabled: !!roomId && !!monthKey,
    initialData: effectiveInitialData
      ? { 
          meals: effectiveInitialData.meals || [], 
          guestMeals: effectiveInitialData.guestMeals || [],
          period: effectiveInitialData.currentPeriod || null,
        }
      : undefined,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: forceRefetch ? 0 : 5 * 60 * 1000,
    refetchOnMount: forceRefetch ? 'always' : true,
    refetchOnWindowFocus: false
  });

  // 1b. Fetch settings, auto-settings, and user stats — fires on roomId alone (no date needed)
  //     This keeps AutoMealStatus and other date-free consumers working correctly.
  const { data: mealConfig = { settings: null, autoSettings: null, userStats: null }, isLoading: isLoadingConfig } = useQuery<{ settings: MealSettings | null, autoSettings: AutoMealSettings | null, userStats: any | null }>({
    queryKey: ['meal-config', roomId, session?.user?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return { settings: null, autoSettings: null, userStats: null };
      const res = await fetchMealsData(session.user.id, roomId);
      return {
        settings: (res.settings ?? null) as MealSettings | null,
        autoSettings: (res.autoSettings ?? null) as AutoMealSettings | null,
        userStats: res.userStats ?? null,
      };
    },
    enabled: !!roomId && !!session?.user?.id,
    initialData: effectiveInitialData
      ? {
          settings: (effectiveInitialData.settings || effectiveInitialData.mealSettings || null) as MealSettings | null,
          autoSettings: (effectiveInitialData.autoSettings || effectiveInitialData.autoMealSettings || null) as AutoMealSettings | null,
          userStats: effectiveInitialData.userStats || effectiveInitialData.userMealStats || null,
        }
      : undefined,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });


  const meals = mealSystem?.meals || [];
  const guestMeals = mealSystem?.guestMeals || [];
  const targetPeriod = mealSystem?.period || null;

  // Settings/stats come from the roomId-gated meal-config query.
  // This works whether or not a selectedDate is provided (fixes AutoMealStatus and similar consumers).
  const mealSettings: MealSettings | null = mealConfig?.settings ?? null;
  const autoMealSettings: AutoMealSettings | null = mealConfig?.autoSettings ?? null;
  const userMealStats: UserMealStats | null = mealConfig?.userStats ?? null;

  // Expose loading state (merged: either query still loading counts as loading)
  const isLoadingUserStats = isLoadingMeals || isLoadingConfig;


  const currentPeriod = targetPeriod || currentPeriodFromHook || effectiveInitialData?.currentPeriod;
  const userRole = userRoleFromProps || effectiveInitialData?.userRole || null;

  // Consolidated loading state — date-bound meals query is the primary signal
  const isLoading = isLoadingMeals;

  // Toggle meal mutation
  const toggleMealMutation = useMutation({
    mutationFn: async ({ date, type, userId, action, silent }: { date: Date; type: MealType; userId: string; action: 'add' | 'remove'; silent?: boolean }) => {
      const formattedDate = formatDateSafe(date);
      const res = await toggleMealAction(roomId!, userId, formattedDate, type, action, currentPeriod?.id);
      if (!res.success) {
          const error = new Error(res.error || 'Failed to toggle meal');
          (error as any).conflict = res.conflict;
          throw error;
      }
      return { meal: action === 'add' ? res.meal : null, success: true }; 
    },
    onMutate: async (variables) => {
      const { date, type, userId } = variables;
      const dateString = formatDateSafe(date);
      const targetMonthKey = format(date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: { meals: Meal[], period: any } | undefined) => {
        if (!old) return old;

        const dateOnly = dateString.split('T')[0];
        const existingMealIndex = old.meals.findIndex(
          m => normalizeDateStr(m.date).startsWith(dateOnly) && m.type === type && m.userId === userId
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

      return { previousData, queryKey };
    },
    onError: (error: any, variables, context: any) => {
      // ROLLBACK LOGIC:
      // - Conflict (P2002 duplicate): meal already exists, keep optimistic state (matches reality). No toast.
      // - Silent flag: auto-triggered meals — never bother the user with a toast.
      // - All other errors: rollback and show a toast.
      if (variables.silent) {
        return; // handle silently
      }
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to update meal');
    },
    onSuccess: (data: any, variables) => {
      const { action, type, date } = variables;
      const dateString = formatDateSafe(date);
      const targetMonthKey = format(date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];
      
      if (action === 'add' && data.meal) {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          
          const updatedMeals = old.meals.map((m: any) => {
            if (m.id.startsWith('temp-') && m.type === type && normalizeDateStr(m.date).startsWith(dateString)) {
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
    onSettled: (_, __, variables) => {
      const targetMonthKey = format(variables.date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, targetMonthKey, targetPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['group-balances', roomId] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', roomId, session?.user?.id] });
    }
  });

  // Consolidated guest meal mutation for add and update
  const patchGuestMealMutation = useMutation({
    mutationFn: async ({ date, type, count }: { date: Date; type: MealType; count: number }) => {
      const formattedDate = formatDateSafe(date);
      const res = await patchGuestMealAction({ 
        roomId: roomId!, 
        userId: session?.user?.id as string, 
        dateStr: formattedDate, 
        type, 
        count, 
        periodId: currentPeriod?.id 
      });
      
      if (!res.success) throw new Error(res.error || "Failed to patch guest meal");
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
      const dateStr = formatDateSafe(date);
      const targetMonthKey = format(date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];
      
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any | undefined) => {
        if (!old) return old;
        
        const existingMealIndex = (old.guestMeals || []).findIndex(
          (m: any) => m.type === type && normalizeDateStr(m.date).startsWith(dateStr) && m.userId === session?.user?.id
        );

        let newGuestMeals = [...(old.guestMeals || [])];

        if (existingMealIndex >= 0) {
          // Update existing
          newGuestMeals[existingMealIndex] = { ...newGuestMeals[existingMealIndex], count };
        } else {
          // Add new temp
          const newGuestMeal: GuestMeal = {
            id: `temp-${Date.now()}`,
            date: date.toISOString(),
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
      
      return { previousData, queryKey };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to update guest meal');
    },
    onSuccess: (data: GuestMeal, variables) => {
      const dateStr = formatDateSafe(variables.date);
      const targetMonthKey = format(variables.date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];
      queryClient.setQueryData(queryKey, (old: any | undefined) => {
        if (!old) return old;
        const dateStr = data.date.split('T')[0];
        const withoutMatching = (old.guestMeals || []).filter(
          (m: any) => !(m.type === data.type && normalizeDateStr(m.date).startsWith(dateStr) && m.userId === data.userId) && !m.id.startsWith('temp-')
        );

        if (data.count === 0) {
          return {
            ...old,
            guestMeals: withoutMatching
          };
        }

        return {
          ...old,
          guestMeals: [data, ...withoutMatching]
        };
      });
    },
    onSettled: (_, __, variables) => {
      const targetMonthKey = format(variables.date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, targetMonthKey, targetPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['group-balances', roomId] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', roomId, session?.user?.id] });
    }
  });

  const deleteGuestMealMutation = useMutation({
    mutationFn: async ({ guestMealId }: { guestMealId: string; date?: Date }) => {
      const res = await deleteGuestMealAction(guestMealId, session?.user?.id as string, currentPeriod?.id);
      if (!res.success) throw new Error(res.error || "Failed to delete guest meal");
      return res;
    },
    onMutate: async (variables) => {
      const { guestMealId, date } = variables;
      const targetMonthKey = date ? format(date, 'yyyy-MM') : monthKey;
      const targetPeriodId = mealSystem?.period?.id || 'current';
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];
      
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any | undefined) => {
        if (!old) return old;
        return {
          ...old,
          guestMeals: (old.guestMeals || []).filter((meal: any) => meal.id !== guestMealId)
        };
      });
      
      return { previousData, queryKey };
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to delete guest meal');
    },
    onSuccess: (_, variables, context: any) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, (old: any | undefined) => {
          if (!old) return old;
          return {
            ...old,
            guestMeals: (old.guestMeals || []).filter((meal: any) => meal.id !== variables.guestMealId)
          };
        });
      }
    },
    onSettled: (_, __, variables, context: any) => {
      const targetMonthKey = variables.date ? format(variables.date, 'yyyy-MM') : monthKey;
      const targetPeriodId = mealSystem?.period?.id || 'current';
      queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, targetMonthKey, targetPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['group-balances', roomId] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', roomId, session?.user?.id] });
    }
  });

  // Update meal settings mutation
  const updateMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<MealSettings>) => {
      const res = await updateMealSettingsAction(roomId!, settings);
      if (!res.success) throw new Error(res.error || "Failed to update meal settings");
      const data = res.data!;
      return {
        ...data,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      } as unknown as MealSettings;
    },
    onSuccess: (data: MealSettings) => {
      // Update the meal-config cache so UI reflects new settings immediately
      queryClient.setQueryData(['meal-config', roomId, session?.user?.id], (old: any) => {
        if (!old) return old;
        return { ...old, settings: data };
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update meal settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-config', roomId] });
    }
  });

  // Update auto meal settings mutation
  const updateAutoMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AutoMealSettings>) => {
      const res = await updateAutoMealSettingsAction(roomId!, session?.user?.id as string, settings);
      if (!res.success) throw new Error(res.error || "Failed to update auto meal settings");
      const data = res.data!;
      return {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate ? data.endDate.toISOString() : undefined,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      } as unknown as AutoMealSettings;
    },
    onMutate: async (newSettings) => {
      const previousData = queryClient.getQueryData(['meal-config', roomId, session?.user?.id]);

      queryClient.setQueryData(['meal-config', roomId, session?.user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          autoSettings: { ...(old.autoSettings || {}), ...newSettings }
        };
      });

      return { previousData };
    },
    onError: (err: any, newSettings, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['meal-config', roomId, session?.user?.id], context.previousData);
      }
      toast.error(err.message || 'Failed to update auto meal settings');
    },
    onSuccess: (data: AutoMealSettings) => {
      // Update the meal-config cache so UI reflects new auto-settings immediately
      queryClient.setQueryData(['meal-config', roomId, session?.user?.id], (old: any) => {
        if (!old) return old;
        return { ...old, autoSettings: data };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-config', roomId] });
    }
  });

  // Trigger auto meals mutation
  const triggerAutoMealsMutation = useMutation({
    mutationFn: async (date: Date) => {
      const formattedDate = formatDateSafe(date);
      const res = await triggerAutoMealsAction(roomId!, formattedDate);
      if (!res.success) throw new Error(res.error || "Failed to trigger auto meals");
      return res;
    },
    onSuccess: (data: any, variables) => {
      // For auto meals, we don't know exactly what changed, but if we have no GET API,
      // we might need the server to return the updated meals list.
      // Assuming for now it's a bulk action.
      toast.success('Auto meals processed successfully');
      const targetMonthKey = format(variables, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, targetMonthKey, targetPeriodId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to trigger auto meals');
    },
    onSettled: () => {
      // No need to invalidate here, already done in onSuccess
    }
  });

  // Utility functions: Filter the period-wide data locally for instant UI updates
  const useMealsByDate = useCallback((date: Date): Meal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const serverMeals = (meals as Meal[]).filter(meal => normalizeDateStr(meal?.date).startsWith(dateStr));
    
    // Merge with optimistic additions/removals
    const userId = session?.user?.id;
    if (!userId) return serverMeals;

    let result = [...serverMeals];
    
    // Handle removals
    Object.entries(optimisticToggles).forEach(([key, action]) => {
      if (key.startsWith(dateStr) && action === 'remove') {
        const parts = key.split('-'); // 1-dateStr (index 0,1,2 after join), 3-type, 4-uid
        const type = parts[3];
        const uid = parts[4];
        if (uid === userId) {
          result = result.filter(m => !(m.type === type && m.userId === uid));
        }
      }
    });

    // Handle additions (simplified for local UI)
    Object.entries(optimisticToggles).forEach(([key, action]) => {
      if (key.startsWith(dateStr) && action === 'add') {
        const parts = key.split('-');
        const type = parts[3] as MealType;
        const uid = parts[4];
        if (uid === userId && !result.some(m => m.type === type && m.userId === uid)) {
          result.push({
            id: `opt-${key}`,
            date: dateStr,
            type,
            userId: uid,
            roomId: roomId!,
            user: session.user as any,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    return result;
  }, [meals, optimisticToggles, session?.user?.id, roomId]);

  const stateRef = useRef({ meals, optimisticToggles });
  useEffect(() => {
    stateRef.current = { meals, optimisticToggles };
  }, [meals, optimisticToggles]);

  const useGuestMealsByDate = useCallback((date: Date): GuestMeal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (guestMeals as GuestMeal[]).filter(meal => normalizeDateStr(meal?.date).startsWith(dateStr));
  }, [guestMeals]);

  const useMealCount = useCallback((date: Date, type: MealType): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const regularMeals = (meals || []).filter((meal: Meal) =>
      normalizeDateStr(meal?.date).startsWith(dateStr) && meal.type === type
    ).length;
    const guestMealsCount = (guestMeals || []).filter((meal: GuestMeal) =>
      normalizeDateStr(meal?.date).startsWith(dateStr) && meal.type === type
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

    // Check optimistic state first
    const optKey = `${dateStr}-${type}-${targetUserId}`;
    if (optimisticToggles[optKey] === 'add') return true;
    if (optimisticToggles[optKey] === 'remove') return false;

    return meals.some((meal: Meal) =>
      normalizeDateStr(meal?.date).startsWith(dateStr) &&
      meal.type === type &&
      meal.userId === targetUserId
    );
  }, [meals, session?.user?.id, optimisticToggles]);

  const canAddMeal = useCallback((date: Date, type: MealType): boolean => {
    return canUserEditMeal(date, type, userRole, mealSettings, currentPeriod);
  }, [mealSettings, currentPeriod, userRole]);

  const canEditGuestMeal = useCallback((date: Date, type: MealType): boolean => {
    return canUserEditMeal(date, type, userRole, mealSettings, currentPeriod);
  }, [mealSettings, currentPeriod, userRole]);



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

  // ─── Client-side Auto Meal Trigger ──────────────────────────────────────────
  // Calculates the exact ms until each meal time and fires a one-shot timer.
  // When it fires, if all conditions are still met it calls toggleMeal.
  // This is the client-side counterpart to the server cron, ensuring auto-meals
  // work even on Vercel hobby plans or when the cron misses the window.
  const scheduledAutoMealsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !roomId) return;
    if (!mealSettings?.autoMealEnabled || !autoMealSettings?.isEnabled) return;

    const MEAL_SCHEDULE: { type: MealType; timeStr: string | undefined; enabled: boolean | undefined }[] = [
      { type: 'BREAKFAST', timeStr: mealSettings.breakfastTime, enabled: autoMealSettings.breakfastEnabled },
      { type: 'LUNCH',     timeStr: mealSettings.lunchTime,     enabled: autoMealSettings.lunchEnabled },
      { type: 'DINNER',    timeStr: mealSettings.dinnerTime,    enabled: autoMealSettings.dinnerEnabled },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    for (const { type, timeStr, enabled } of MEAL_SCHEDULE) {
      if (!enabled || !timeStr) continue;
      if (autoMealSettings.excludedMealTypes?.includes(type)) continue;
      if (autoMealSettings.excludedDates?.includes(todayStr)) continue;

      const [hours, minutes] = timeStr.split(':').map(Number);
      const now = new Date();
      const mealTimeToday = new Date(now);
      mealTimeToday.setHours(hours, minutes, 0, 0);

      let msUntilMealTime = mealTimeToday.getTime() - now.getTime();

      // 5-minute grace window: if tab was suspended at the exact moment, still fire
      if (msUntilMealTime < -(5 * 60 * 1000)) continue; // too late, skip
      if (msUntilMealTime < 0) msUntilMealTime = 0;     // fire immediately within grace

      const scheduleKey = `${todayStr}-${type}`;

      const timer = setTimeout(async () => {
        // Guard: avoid double-firing if effect re-runs before cleanup
        if (scheduledAutoMealsRef.current.has(scheduleKey)) return;

        // Read fresh meal state from the ref (prevents stale closure)
        const { meals: currentMeals, optimisticToggles: currOpt } = stateRef.current;
        const alreadyAdded =
          currentMeals.some((m: Meal) =>
            normalizeDateStr(m?.date).startsWith(todayStr) &&
            m.type === type &&
            m.userId === userId
          ) || currOpt[`${todayStr}-${type}-${userId}`] === 'add';

        if (alreadyAdded) return;

        scheduledAutoMealsRef.current.add(scheduleKey);

        try {
          const mealDate = new Date();
          mealDate.setHours(0, 0, 0, 0);
          // Pass a silent onError so that server-side rejections (period locked,
          // cutoff exceeded, etc.) never pop a toast at the user. The optimistic
          // update already put the meal in the UI; if the server rejects it,
          // the mutation's onError will roll it back silently.
          await toggleMealMutation.mutateAsync(
            { date: mealDate, type, userId, action: 'add', silent: true },
            {
              onError: () => {
                scheduledAutoMealsRef.current.delete(scheduleKey);
              },
            }
          );
        } catch {
          // mutateAsync re-throws — already handled in the per-call onError above
          scheduledAutoMealsRef.current.delete(scheduleKey);
        }
      }, msUntilMealTime);

      timers.push(timer);
    }

    return () => { timers.forEach(clearTimeout); };
  }, [
    session?.user?.id,
    roomId,
    mealSettings?.autoMealEnabled,
    mealSettings?.breakfastTime,
    mealSettings?.lunchTime,
    mealSettings?.dinnerTime,
    autoMealSettings?.isEnabled,
    autoMealSettings?.breakfastEnabled,
    autoMealSettings?.lunchEnabled,
    autoMealSettings?.dinnerEnabled,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(autoMealSettings?.excludedMealTypes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(autoMealSettings?.excludedDates),
    selectedDate?.toDateString(),
  ]);
  // ──────────────────────────────────────────────────────────────────────────

  // Get user's guest meals for a specific date
  const getUserGuestMeals = useCallback((date: Date, userId?: string): GuestMeal[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) return [];

    return guestMeals.filter((meal: GuestMeal) =>
      normalizeDateStr(meal?.date).startsWith(dateStr) &&
      meal.userId === targetUserId
    );
  }, [guestMeals, session?.user?.id]);

  // Get total guest meals for a user on a specific date and type
  const getUserGuestMealCount = useCallback((date: Date, type: MealType, userId?: string): number => {
    const userGuestMeals = getUserGuestMeals(date, userId);
    return userGuestMeals
      .filter((meal: GuestMeal) => meal.type === type)
      .reduce((sum: number, meal: GuestMeal) => sum + meal.count, 0);
  }, [getUserGuestMeals]);

  // Get user's meal count for a specific date and type
  const getUserMealCount = useCallback((date: Date, type: MealType, userId?: string): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) return 0;

    const regularMeals = meals.filter((meal: Meal) =>
      normalizeDateStr(meal?.date).startsWith(dateStr) &&
      meal.type === type &&
      meal.userId === targetUserId
    ).length;

    const guestMealsCount = guestMeals.filter((meal: GuestMeal) =>
      normalizeDateStr(meal?.date).startsWith(dateStr) &&
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

  // Mutation wrappers with debouncing
  const toggleMeal = useCallback(async (date: Date, type: MealType, userId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${dateStr}-${type}-${userId}`;
    const { meals: currentMeals, optimisticToggles: currOpt } = stateRef.current;
    
    // Determine the next action based on current state (respecting optimistic state)
    let currentHasMeal = false;
    if (currOpt[key] === 'add') currentHasMeal = true;
    else if (currOpt[key] === 'remove') currentHasMeal = false;
    else {
      currentHasMeal = currentMeals.some((m: Meal) =>
        normalizeDateStr(m?.date).startsWith(dateStr) &&
        m.type === type &&
        m.userId === userId
      );
    }
    
    const nextAction = currentHasMeal ? 'remove' : 'add';

    // 1. Update UI Instantly
    setOptimisticToggles((prev: Record<string, 'add' | 'remove' | null>) => ({ ...prev, [key]: nextAction }));

    // 2. Clear existing debounce timer
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }

    // 3. Set new debounce timer
    timeoutRefs.current[key] = setTimeout(async () => {
      const latestAction = nextAction;

      // Check if server state already matches what we want to achieve directly from queryClient cache for ultimate freshness
      const targetMonthKey = format(date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || 'current';
      const data = queryClient.getQueryData(['meals-system', roomId, targetMonthKey, targetPeriodId]) as any;
      const cachedMeals = data?.meals || [];
      const serverHasMeal = cachedMeals.some((m: any) => 
        normalizeDateStr(m.date).startsWith(dateStr) && m.type === type && m.userId === userId
      );

      if ((latestAction === 'add' && serverHasMeal) || (latestAction === 'remove' && !serverHasMeal)) {
        setOptimisticToggles((prev: Record<string, 'add' | 'remove' | null>) => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        return;
      }

      try {
        await toggleMealMutation.mutateAsync({ date, type, userId, action: latestAction });
      } catch (err) {
        // Silently catch to prevent Next.js error overlay, React Query onError already handles the toast
      } finally {
        // Clear optimistic state and timer ref
        setOptimisticToggles((prev: Record<string, 'add' | 'remove' | null>) => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        delete timeoutRefs.current[key];
      }
    }, 400); // Throttling to 400ms for responsiveness vs reliability
  }, [toggleMealMutation, queryClient, roomId]);

  const addGuestMeal = useCallback(async (date: Date, type: MealType, count: number) => {
    await patchGuestMealMutation.mutateAsync({ date, type, count });
  }, [patchGuestMealMutation]);

  const deleteGuestMeal = useCallback(async (guestMealId: string, date?: Date) => {
    // If it's a temp ID, we just need to update the client-side cache
    if (guestMealId.startsWith('temp-')) {
      const targetMonthKey = date ? format(date, 'yyyy-MM') : monthKey;
      queryClient.setQueryData(['meals-system', roomId, targetMonthKey], (old: any | undefined) => {
        if (!old) return old;
        return {
          ...old,
          guestMeals: (old.guestMeals || []).filter((meal: any) => meal.id !== guestMealId)
        };
      });
      return;
    }
    await deleteGuestMealMutation.mutateAsync({ guestMealId, date });
  }, [deleteGuestMealMutation, roomId, monthKey, queryClient]);

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
    isLoading: isLoadingMeals,
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
    addGuestMeal,
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
    canEditGuestMeal,
    getUserGuestMeals,
    getUserGuestMealCount,
    getUserMealCount,
    userRole,
    currentPeriod: currentPeriod || effectiveInitialData?.currentPeriod,
    optimisticToggles
  };
}

export default useMeal;
