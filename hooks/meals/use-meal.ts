/**
 * FACADE HOOK - useMeal
 * This hook is now a wrapper around modular hooks to maintain backward compatibility
 */

import { useMeals } from './use-meals';
import { useGuestMeals } from './use-guest-meals';
import { useMealMutations } from './use-meal-mutations';
import { useMealSettings } from './use-meal-settings';
import { useAutoMeal } from './use-auto-meal';
import { useCallback } from 'react';
import { canUserEditMeal, formatDateSafe } from '@/lib/utils/period-utils-shared';
import { MealType } from './use-meals';

export function useMeal(roomId?: string, selectedDate?: Date, initialData?: any, userRoleFromProps?: string | null) {
  const { meals, getMealsByDate, hasMeal, isLoading: isLoadingMeals } = useMeals(roomId, selectedDate);
  const { guestMeals, getGuestMealsByDate, addGuestMeal, deleteGuestMeal, getUserGuestMeals, getUserGuestMealCount } = useGuestMeals(roomId, selectedDate);
  const { toggleMeal } = useMealMutations(roomId);
  const settingsHook = useMealSettings(roomId);
  const { triggerAutoMeals } = useAutoMeal(roomId, settingsHook.mealSettings, settingsHook.autoMealSettings);

  const canAddMeal = useCallback((date: Date, type: MealType) => 
    canUserEditMeal(date, type, userRoleFromProps ?? null, settingsHook.mealSettings, null), [userRoleFromProps, settingsHook.mealSettings]);

  const useMealCount = useCallback((date: Date, type: MealType): number => {
    const regularCount = getMealsByDate(date).filter(m => m.type === type).length;
    const guestCount = getGuestMealsByDate(date).filter(m => m.type === type).reduce((sum, m) => sum + m.count, 0);
    return regularCount + guestCount;
  }, [getMealsByDate, getGuestMealsByDate]);

  const shouldAutoAddMeal = useCallback((date: Date, type: MealType) => {
    const { mealSettings, autoMealSettings } = settingsHook;
    if (!mealSettings?.autoMealEnabled || !autoMealSettings?.isEnabled) return false;

    const dateStr = formatDateSafe(date);
    if (autoMealSettings.excludedDates.includes(dateStr)) return false;
    if (autoMealSettings.excludedMealTypes.includes(type as any)) return false;

    if (type === 'BREAKFAST') return autoMealSettings.breakfastEnabled;
    if (type === 'LUNCH') return autoMealSettings.lunchEnabled;
    if (type === 'DINNER') return autoMealSettings.dinnerEnabled;

    return false;
  }, [settingsHook.mealSettings, settingsHook.autoMealSettings]);

  const isAutoMealTime = useCallback((date: Date, type: MealType) => {
    const { mealSettings } = settingsHook;
    if (!mealSettings) return false;

    let mealTimeStr = '';
    if (type === 'BREAKFAST') mealTimeStr = mealSettings.breakfastTime || '08:00';
    if (type === 'LUNCH') mealTimeStr = mealSettings.lunchTime || '13:00';
    if (type === 'DINNER') mealTimeStr = mealSettings.dinnerTime || '20:00';

    const [h, m] = mealTimeStr.split(':').map(Number);
    const now = new Date();
    const mealTime = new Date(date);
    mealTime.setHours(h, m, 0, 0);

    return now >= mealTime;
  }, [settingsHook.mealSettings]);

  return {
    // Data
    meals,
    guestMeals: guestMeals,
    mealSettings: settingsHook.mealSettings,
    autoMealSettings: settingsHook.autoMealSettings,
    userMealStats: initialData?.userStats || null,
    
    // Loading States
    isLoading: isLoadingMeals || settingsHook.isLoading,
    isLoadingUserStats: false, // Default to false as it's not currently tracked separately
    isTogglingMeal: toggleMeal.isPending,
    isPatchingGuestMeal: addGuestMeal.isPending,
    isDeletingGuestMeal: deleteGuestMeal.isPending,
    
    // Methods
    useMealsByDate: getMealsByDate,
    useGuestMealsByDate: getGuestMealsByDate,
    useMealCount,
    
    // Mutations
    toggleMeal: async (date: Date, type: MealType, userId: string) => {
        await toggleMeal.mutateAsync({ date, type, userId, action: 'add' });
    },
    addGuestMeal: async (date: Date, type: MealType, count: number, isUpdate?: boolean) => {
        await addGuestMeal.mutateAsync({ date, type, count, isUpdate });
    },
    deleteGuestMeal: (guestMealId: string, date?: Date) => 
      deleteGuestMeal.mutate({ guestMealId, date: date || new Date() }),
    
    updateMealSettings: settingsHook.updateMealSettings.mutateAsync,
    updateAutoMealSettings: settingsHook.updateAutoMealSettings.mutateAsync,
    triggerAutoMeals: triggerAutoMeals.mutateAsync,
    
    // Utilities
    hasMeal,
    canAddMeal,
    shouldAutoAddMeal,
    isAutoMealTime,
    canEditGuestMeal: canAddMeal,
    getUserGuestMeals: getUserGuestMeals,
    getUserGuestMealCount: getUserGuestMealCount,
    getUserMealCount: (date: Date, type: MealType, userId?: string) => (hasMeal(date, type, userId) ? 1 : 0) + getUserGuestMealCount(date, type, userId),
    userRole: userRoleFromProps || null,
  };
}

export default useMeal;
