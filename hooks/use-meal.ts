import { useCallback, useRef, useEffect, useState, useOptimistic, useTransition } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { 
  format, 
  eachDayOfInterval, 
  startOfDay, 
  endOfDay
} from 'date-fns';
import { toast } from 'sonner';

import { 
  fetchMealsData 
} from '@/lib/services/meals-service';
import {
  toggleMeal as toggleMealAction, 
  addGuestMeal as patchGuestMealAction, 
  deleteGuestMeal as deleteGuestMealAction,
  updateMealSettings as updateMealSettingsAction,
  updateAutoMealSettings as updateAutoMealSettingsAction,
  triggerAutoMeals as triggerAutoMealsAction
} from '@/lib/actions/meal.actions';
import { useCurrentPeriod } from './use-periods';
import { canUserEditMeal, formatDateSafe } from '@/lib/utils/period-utils-shared';

// Define local normalizeDateStr if it's not in utils
const normalizeDateStr = (date: any): string => {
  if (!date) return '';
  return formatDateSafe(date);
};

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export interface Meal {
  id: string;
  date: string | Date;
  type: MealType;
  userId: string;
  roomId: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
  };
}

export interface GuestMeal {
  id: string;
  date: string | Date;
  type: MealType;
  count: number;
  userId: string;
  roomId: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
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
  excludedMealTypes: MealType[];
  excludedDates: string[];
}

export interface UserMealStats {
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

export interface MealSummary {
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

export interface MealsPageData {
  meals: Meal[];
  guestMeals: GuestMeal[];
  settings: MealSettings | null;
  autoSettings: AutoMealSettings | null;
  userStats: UserMealStats | null;
  currentPeriod: any;
  userRole: string | null;
  members: any[];
  groupId?: string;
  timestamp?: string | number;
}

export interface UseMealReturn {
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
  isPending: boolean;
}

export function useMeal(roomId?: string, selectedDate?: Date, initialData?: MealsPageData, userRoleFromProps?: string | null, forceRefetch?: boolean): UseMealReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: currentPeriodFromHook } = useCurrentPeriod();

  // Priority: 1. Passed initialData, 2. Server-side currentPeriod
  const effectiveInitialData = initialData && (!initialData.groupId || initialData.groupId === roomId) ? initialData : null;

  const monthKey = selectedDate ? format(selectedDate, 'yyyy-MM') : null;
  const selectedDateStr = selectedDate ? formatDateSafe(selectedDate) : null;

  const dateRef = useRef(selectedDateStr);
  useEffect(() => {
    dateRef.current = selectedDateStr;
  }, [selectedDateStr]);

  const periodIdInCache = effectiveInitialData?.currentPeriod?.id || initialData?.currentPeriod?.id || 'current';
  
  // 1a. Fetch meals + guest meals + period
  const { data: mealSystem = { meals: [], guestMeals: [], period: null, members: [] }, isLoading: isLoadingMeals } = useQuery<{ meals: Meal[], guestMeals: GuestMeal[], period: any, members: any[] }>({
    queryKey: ['meals-system', roomId, monthKey, periodIdInCache],
    queryFn: async ({ queryKey }): Promise<{ meals: Meal[], guestMeals: GuestMeal[], period: any, members: any[] }> => {
      const [_key, _roomId, _monthKey] = queryKey as [string, string, string];
      if (!_roomId || !selectedDate) return { meals: [], guestMeals: [], period: null, members: [] };
      const res = await fetchMealsData(session?.user?.id as string, _roomId, { date: selectedDate });
      return {
        meals: (res.meals || []) as Meal[],
        period: res.currentPeriod || null,
        guestMeals: (res.guestMeals || []) as GuestMeal[],
        members: (res as any).members || [],
      };
    },
    enabled: !!roomId && !!monthKey,
    initialData: effectiveInitialData
      ? { 
          meals: (effectiveInitialData.meals || []) as Meal[], 
          guestMeals: (effectiveInitialData.guestMeals || []) as GuestMeal[],
          period: (effectiveInitialData as any).currentPeriod || (effectiveInitialData as any).period || null,
          members: (effectiveInitialData as any).members || [],
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

  // 1b. Fetch settings, auto-settings, and user stats
  const mealConfigQuery = useQuery({
    queryKey: ['meal-config', roomId, session?.user?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return { settings: null, autoSettings: null, userStats: null, userRole: null };
      const res = await fetchMealsData(session.user.id, roomId);
      return {
        settings: (res.settings ?? null) as MealSettings | null,
        autoSettings: (res.autoSettings ?? null) as AutoMealSettings | null,
        userStats: res.userStats ?? null,
        userRole: res.userRole ?? null,
      };
    },
    enabled: !!roomId && !!session?.user?.id,
    initialData: effectiveInitialData
      ? {
          settings: (effectiveInitialData.settings || (effectiveInitialData as any).mealSettings || null) as MealSettings | null,
          autoSettings: (effectiveInitialData.autoSettings || (effectiveInitialData as any).autoMealSettings || null) as AutoMealSettings | null,
          userStats: effectiveInitialData.userStats || (effectiveInitialData as any).userMealStats || null,
          userRole: effectiveInitialData.userRole || null,
        }
      : undefined,
    initialDataUpdatedAt: effectiveInitialData ? new Date(effectiveInitialData.timestamp || Date.now()).getTime() : undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const mealConfig = mealConfigQuery.data || { settings: null, autoSettings: null, userStats: null, userRole: null };
  const mealSettings = mealConfig.settings;
  const autoMealSettings = mealConfig.autoSettings;
  const userMealStats = mealConfig.userStats;
  const userRole = userRoleFromProps || mealConfig.userRole || effectiveInitialData?.userRole || null;
  const currentPeriod = targetPeriod || currentPeriodFromHook || effectiveInitialData?.currentPeriod;

  const isLoadingConfig = mealConfigQuery.isLoading;
  const isLoadingUserStats = isLoadingMeals || isLoadingConfig;
  const isLoading = isLoadingMeals;

  // 0. Transition and Optimistic State
  const [isPending, startTransition] = useTransition();
  const [optimisticMeals, addOptimisticMeal] = useOptimistic(
    meals,
    (state: Meal[], update: { action: 'add' | 'remove', meal?: Meal, userId: string, type: MealType, dateStr: string }) => {
      if (update.action === 'add') {
        const alreadyHas = state.some(m => m.userId === update.userId && m.type === update.type && normalizeDateStr(m.date) === update.dateStr);
        if (alreadyHas) return state;
        return [update.meal!, ...state];
      } else {
        return state.filter(m => !(m.type === update.type && m.userId === update.userId && normalizeDateStr(m.date) === update.dateStr));
      }
    }
  );

  const [optimisticGuestMeals, addOptimisticGuestMeal] = useOptimistic(
    guestMeals,
    (state: GuestMeal[], update: { action: 'add' | 'remove' | 'update', meal?: GuestMeal, id?: string, count?: number, userId?: string, type?: MealType, dateStr?: string }) => {
      if (update.action === 'add') {
        const alreadyHas = state.some(m => m.userId === update.meal!.userId && m.type === update.meal!.type && normalizeDateStr(m.date) === normalizeDateStr(update.meal!.date));
        if (alreadyHas) return state;
        return [...state, update.meal!];
      } else if (update.action === 'update') {
        return state.map(m => m.id === update.id ? { ...m, count: update.count! } : m);
      } else {
        return state.filter(m => m.id !== update.id);
      }
    }
  );

  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Mutations
  const toggleMealMutation = useMutation({
    mutationFn: async ({ date, type, userId, action, silent }: { date: Date; type: MealType; userId: string; action: 'add' | 'remove'; silent?: boolean }) => {
      const dateStr = formatDateSafe(date);
      const res = await toggleMealAction(roomId!, userId, dateStr, type, action, currentPeriod?.id);
      if (!res.success) {
          const error = new Error(res.error);
          (error as any).conflict = res.conflict;
          throw error;
      }
      return { meal: action === 'add' ? res.meal : null, success: true }; 
    },
    onMutate: async (variables) => {
      const { date, type, userId } = variables;
      const dateString = formatDateSafe(date);
      const targetMonthKey = format(date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || periodIdInCache;
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const dateOnly = dateString.split('T')[0];
        const alreadyHasMeal = old.meals?.some(
          (m: Meal) => normalizeDateStr(m.date) === dateOnly && m.type === type && m.userId === userId
        );

        let newMeals = [...(old.meals || [])];
        if (alreadyHasMeal) {
          newMeals = newMeals.filter(m => !(normalizeDateStr(m.date) === dateOnly && m.type === type && m.userId === userId));
        } else {
          const memberUser = old.members?.find((m: any) => m.userId === userId)?.user;
          const userObj = userId === session?.user?.id ? session.user : memberUser;
          if (userObj) {
            newMeals.push({
              id: `temp-${type}-${dateOnly}-${Date.now()}`,
              date: dateString,
              type,
              userId,
              roomId: roomId!,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: userObj as any
            });
          }
        }
        return { ...old, meals: newMeals };
      });
      return { previousData, queryKey };
    },
    onError: (error: any, variables, context: any) => {
      if (!variables.silent && context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
        toast.error(error.message || 'Failed to toggle meal');
      }
    },
    onSettled: (_, __, variables) => {
      const targetMonthKey = format(variables.date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || periodIdInCache;
      queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, targetMonthKey, targetPeriodId], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['group-balances', roomId] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', roomId, session?.user?.id] });
    }
  });

  const patchGuestMealMutation = useMutation({
    mutationFn: async ({ date, type, count }: { date: Date; type: MealType; count: number }) => {
      const dateStr = formatDateSafe(date);
      const res = await patchGuestMealAction({ 
        roomId: roomId!, 
        userId: session?.user?.id as string, 
        dateStr, 
        type, 
        count, 
        periodId: currentPeriod?.id 
      });
      if (!res.success) throw new Error(res.error || "Failed to patch guest meal");
      const meal = res.data!;
      return meal;
    },
    onMutate: async (variables) => {
      const { date, type, count } = variables;
      const dateStr = formatDateSafe(date);
      const targetMonthKey = format(date, 'yyyy-MM');
      const targetPeriodId = mealSystem?.period?.id || periodIdInCache;
      const queryKey = ['meals-system', roomId, targetMonthKey, targetPeriodId];
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        let newGuestMeals = [...(old.guestMeals || [])];
        const existingIdx = newGuestMeals.findIndex(m => m.type === type && normalizeDateStr(m.date) === dateStr.split('T')[0] && m.userId === session?.user?.id);
        if (existingIdx >= 0) {
          if (count <= 0) {
            newGuestMeals.splice(existingIdx, 1);
          } else {
            newGuestMeals[existingIdx] = { ...newGuestMeals[existingIdx], count };
          }
        } else if (count > 0) {
          newGuestMeals.push({
            id: `temp-guest-${Date.now()}`,
            date: date.toISOString(),
            type,
            count,
            userId: session?.user?.id!,
            roomId: roomId!,
            user: session?.user as any
          });
        }
        return { ...old, guestMeals: newGuestMeals };
      });
      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) queryClient.setQueryData(context.queryKey, context.previousData);
      toast.error(error.message);
    },
    onSettled: (_, __, variables) => {
        const targetMonthKey = format(variables.date, 'yyyy-MM');
        queryClient.invalidateQueries({ queryKey: ['meals-system', roomId, targetMonthKey], refetchType: 'none' });
    }
  });

  const deleteGuestMealMutation = useMutation({
    mutationFn: async ({ guestMealId }: { guestMealId: string; date?: Date }) => {
      const res = await deleteGuestMealAction(guestMealId, session?.user?.id as string, currentPeriod?.id);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onMutate: async ({ guestMealId, date }) => {
        const targetMonthKey = date ? format(date, 'yyyy-MM') : monthKey;
        const queryKey = ['meals-system', roomId, targetMonthKey, periodIdInCache];
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: any) => ({
            ...old,
            guestMeals: (old?.guestMeals || []).filter((m: any) => m.id !== guestMealId)
        }));
        return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
        if (context?.previousData) queryClient.setQueryData(context.queryKey, context.previousData);
        toast.error(error.message);
    }
  });

  const updateMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<MealSettings>) => {
      const res = await updateMealSettingsAction(roomId!, settings);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(['meal-config', roomId, session?.user?.id], (old: any) => ({ ...old, settings: data }));
    }
  });

  const updateAutoMealSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AutoMealSettings>) => {
      const res = await updateAutoMealSettingsAction(roomId!, session?.user?.id as string, settings);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(['meal-config', roomId, session?.user?.id], (old: any) => ({ ...old, autoSettings: data }));
    }
  });

  const triggerAutoMealsMutation = useMutation({
    mutationFn: async (date: Date) => {
      const dateStr = formatDateSafe(date);
      const res = await triggerAutoMealsAction(roomId!, dateStr);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
        toast.success('Auto meals triggered');
        queryClient.invalidateQueries({ queryKey: ['meals-system', roomId] });
    }
  });

  // Utility functions
  const useMealsByDate = useCallback((date: Date): Meal[] => {
    const dateStr = formatDateSafe(date);
    return (optimisticMeals as Meal[]).filter(meal => normalizeDateStr(meal?.date) === dateStr);
  }, [optimisticMeals]);

  const stateRef = useRef({ meals, optimisticMeals, guestMeals, optimisticGuestMeals });
  useEffect(() => {
    stateRef.current = { meals, optimisticMeals, guestMeals, optimisticGuestMeals };
  }, [meals, optimisticMeals, guestMeals, optimisticGuestMeals]);

  const useGuestMealsByDate = useCallback((date: Date): GuestMeal[] => {
    const dateStr = formatDateSafe(date);
    return (optimisticGuestMeals as GuestMeal[]).filter(meal => normalizeDateStr(meal?.date) === dateStr);
  }, [optimisticGuestMeals]);

  const useMealCount = useCallback((date: Date, type: MealType): number => {
    const dateStr = formatDateSafe(date);
    const regularCount = (optimisticMeals || []).filter((meal: Meal) => normalizeDateStr(meal?.date) === dateStr && meal.type === type).length;
    const guestMealsCount = (optimisticGuestMeals || []).filter((meal: GuestMeal) => normalizeDateStr(meal?.date) === dateStr && meal.type === type).reduce((sum, meal) => sum + meal.count, 0);
    return regularCount + guestMealsCount;
  }, [optimisticMeals, optimisticGuestMeals]);

  const useMealSummary = useCallback((startDate: Date, endDate: Date): MealSummary[] => {
    const dates = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });
    return dates.map(date => {
        const dateStr = formatDateSafe(date);
        return {
            date: dateStr,
            breakfast: useMealCount(date, 'BREAKFAST'),
            lunch: useMealCount(date, 'LUNCH'),
            dinner: useMealCount(date, 'DINNER'),
            total: useMealCount(date, 'BREAKFAST') + useMealCount(date, 'LUNCH') + useMealCount(date, 'DINNER')
        };
    });
  }, [useMealCount]);

  const useUserMealStats = useCallback((month?: string): UserMealStats | null => {
    return userMealStats;
  }, [userMealStats]);

  const toggleMeal = useCallback(async (date: Date, type: MealType, userId: string) => {
    const dateStr = formatDateSafe(date);
    const { optimisticMeals: currentOptimisticMeals } = stateRef.current;
    const currentlyHasMeal = currentOptimisticMeals.some((m: Meal) => normalizeDateStr(m?.date) === dateStr && m.type === type && m.userId === userId);
    const isAdding = !currentlyHasMeal;

    startTransition(async () => {
        if (isAdding) {
            const memberUser = (mealSystem as any)?.members?.find((m: any) => m.userId === userId)?.user;
            const userObj = userId === session?.user?.id ? session.user : memberUser;
            if (userObj) {
                addOptimisticMeal({
                    action: 'add',
                    meal: { id: `opt-${Date.now()}`, date: dateStr, type, userId, roomId: roomId!, user: userObj as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                    userId, type, dateStr: dateStr
                });
            }
        } else {
            addOptimisticMeal({ action: 'remove', userId, type, dateStr: dateStr });
        }
        await toggleMealMutation.mutateAsync({ date, type, userId, action: isAdding ? 'add' : 'remove' });
    });
  }, [addOptimisticMeal, meals, session, roomId, toggleMealMutation, mealSystem]);

  const addGuestMeal = useCallback(async (date: Date, type: MealType, count: number) => {
    const dateStr = formatDateSafe(date);
    const existing = (optimisticGuestMeals as GuestMeal[]).find(m => m.type === type && normalizeDateStr(m.date) === dateStr && m.userId === session?.user?.id);

    startTransition(async () => {
        if (existing) {
            if (count <= 0) {
                addOptimisticGuestMeal({ action: 'remove', id: existing.id });
            } else {
                addOptimisticGuestMeal({ action: 'update', id: existing.id, count });
            }
        } else if (count > 0) {
            addOptimisticGuestMeal({
                action: 'add',
                meal: {
                    id: `opt-guest-${Date.now()}`,
                    date: dateStr,
                    type,
                    count,
                    userId: session?.user?.id!,
                    roomId: roomId!,
                    user: session?.user as any,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });
        }
        await patchGuestMealMutation.mutateAsync({ date, type, count });
    });
  }, [patchGuestMealMutation, optimisticGuestMeals, session?.user?.id, roomId, startTransition, addOptimisticGuestMeal]);

  const deleteGuestMeal = useCallback(async (guestMealId: string, date?: Date) => {
    startTransition(async () => {
        addOptimisticGuestMeal({ action: 'remove', id: guestMealId });
        await deleteGuestMealMutation.mutateAsync({ guestMealId, date });
    });
  }, [deleteGuestMealMutation, startTransition, addOptimisticGuestMeal]);

  const updateMealSettings = useCallback(async (settings: Partial<MealSettings>) => {
    await updateMealSettingsMutation.mutateAsync(settings);
  }, [updateMealSettingsMutation]);

  const updateAutoMealSettings = useCallback(async (settings: Partial<AutoMealSettings>) => {
    await updateAutoMealSettingsMutation.mutateAsync(settings);
  }, [updateAutoMealSettingsMutation]);

  const triggerAutoMeals = useCallback(async (date: Date) => {
    await triggerAutoMealsMutation.mutateAsync(date);
  }, [triggerAutoMealsMutation]);

  const hasMeal = useCallback((date: Date, type: MealType, userId?: string): boolean => {
    const dateStr = formatDateSafe(date);
    const targetUserId = userId || session?.user?.id;
    return (optimisticMeals as Meal[]).some(m => normalizeDateStr(m.date) === dateStr && m.type === type && m.userId === targetUserId);
  }, [optimisticMeals, session?.user?.id]);

  const canAddMeal = useCallback((date: Date, type: MealType) => canUserEditMeal(date, type, userRole, mealSettings, currentPeriod), [userRole, mealSettings, currentPeriod]);
  const canEditGuestMeal = useCallback((date: Date, type: MealType) => canUserEditMeal(date, type, userRole, mealSettings, currentPeriod), [userRole, mealSettings, currentPeriod]);

  const isAutoMealTime = useCallback((date: Date, type: MealType) => {
    if (!mealSettings?.autoMealEnabled || !autoMealSettings?.isEnabled) return false;
    const now = new Date();
    const time = type === 'BREAKFAST' ? mealSettings.breakfastTime : type === 'LUNCH' ? mealSettings.lunchTime : mealSettings.dinnerTime;
    return format(now, 'HH:mm') === time;
  }, [mealSettings, autoMealSettings]);

  const shouldAutoAddMeal = useCallback((date: Date, type: MealType) => {
    if (!mealSettings?.autoMealEnabled || !autoMealSettings?.isEnabled) return false;
    const isTypeEnabled = type === 'BREAKFAST' ? autoMealSettings.breakfastEnabled : type === 'LUNCH' ? autoMealSettings.lunchEnabled : autoMealSettings.dinnerEnabled;
    if (!isTypeEnabled || (autoMealSettings.excludedMealTypes as any).includes(type) || autoMealSettings.excludedDates.includes(format(date, 'yyyy-MM-dd')) || hasMeal(date, type)) return false;
    return isAutoMealTime(date, type);
  }, [mealSettings, autoMealSettings, hasMeal, isAutoMealTime]);

  const getUserGuestMeals = useCallback((date: Date, userId?: string) => {
    const dateStr = formatDateSafe(date);
    return (optimisticGuestMeals as GuestMeal[]).filter(m => normalizeDateStr(m.date) === dateStr && m.userId === (userId || session?.user?.id));
  }, [optimisticGuestMeals, session?.user?.id]);

  const getUserGuestMealCount = useCallback((date: Date, type: MealType, userId?: string) => getUserGuestMeals(date, userId).filter(m => m.type === type).reduce((s, m) => s + m.count, 0), [getUserGuestMeals]);
  const getUserMealCount = useCallback((date: Date, type: MealType, userId?: string) => (hasMeal(date, type, userId) ? 1 : 0) + getUserGuestMealCount(date, type, userId), [hasMeal, getUserGuestMealCount]);

  // Effects for auto-trigger
  const scheduledAutoMealsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !roomId || !mealSettings?.autoMealEnabled || !autoMealSettings?.isEnabled) return;
    const schedule = [{ type: 'BREAKFAST', t: mealSettings.breakfastTime, e: autoMealSettings.breakfastEnabled }, { type: 'LUNCH', t: mealSettings.lunchTime, e: autoMealSettings.lunchEnabled }, { type: 'DINNER', t: mealSettings.dinnerTime, e: autoMealSettings.dinnerEnabled }];
    const timers: any[] = [];
    const today = format(new Date(), 'yyyy-MM-dd');
    schedule.forEach(({ type, t, e }) => {
        if (!e || !t || (autoMealSettings.excludedMealTypes as any).includes(type) || autoMealSettings.excludedDates.includes(today)) return;
        const [h, m] = t.split(':').map(Number);
        const mealTime = new Date(); mealTime.setHours(h, m, 0, 0);
        let ms = mealTime.getTime() - Date.now();
        if (ms < -300000 || ms > 86400000) return;
        if (ms < 0) ms = 0;
        timers.push(setTimeout(() => {
            if (scheduledAutoMealsRef.current.has(`${today}-${type}`) || hasMeal(new Date(), type as any)) return;
            scheduledAutoMealsRef.current.add(`${today}-${type}`);
            toggleMealMutation.mutate({ date: new Date(), type: type as any, userId, action: 'add', silent: true }, { onError: () => scheduledAutoMealsRef.current.delete(`${today}-${type}`) });
        }, ms));
    });
    return () => timers.forEach(clearTimeout);
  }, [session?.user?.id, roomId, mealSettings, autoMealSettings, toggleMealMutation, hasMeal]);

  return {
    meals: optimisticMeals, guestMeals: optimisticGuestMeals, mealSettings, autoMealSettings, userMealStats,
    isLoading, isLoadingUserStats,
    isTogglingMeal: toggleMealMutation.isPending,
    isPatchingGuestMeal: patchGuestMealMutation.isPending,
    isDeletingGuestMeal: deleteGuestMealMutation.isPending,
    error: null,
    isPending,
    useMealsByDate, useGuestMealsByDate, useMealSummary, useMealCount, useUserMealStats,
    toggleMeal, addGuestMeal, deleteGuestMeal,
    updateMealSettings, updateAutoMealSettings, triggerAutoMeals,
    isAutoMealTime, shouldAutoAddMeal,
    hasMeal, canAddMeal, canEditGuestMeal,
    getUserGuestMeals, getUserGuestMealCount, getUserMealCount,
    userRole, currentPeriod
  };
}

export default useMeal;
