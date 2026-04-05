import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { fetchMealsData } from '@/lib/services/meals-service';
import { 
  updateMealSettings as updateMealSettingsAction, 
  updateAutoMealSettings as updateAutoMealSettingsAction 
} from '@/lib/actions/meal.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

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

/**
 * Hook for managing group meal settings and user auto-meal preferences.
 */
export function useMealSettings(roomId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: config = { settings: null, autoSettings: null }, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.MEAL_CONFIG, roomId, session?.user?.id],
    queryFn: async () => {
      if (!roomId || !session?.user?.id) return { settings: null, autoSettings: null };
      const res = await fetchMealsData(session.user.id, roomId);
      return {
        settings: (res.settings ?? null) as MealSettings | null,
        autoSettings: (res.autoSettings ?? null) as AutoMealSettings | null,
      };
    },
    enabled: !!roomId && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const updateMealSettings = useMutation<MealSettings, Error, Partial<MealSettings>>({
    mutationFn: async (settings) => {
      const res = await updateMealSettingsAction(roomId!, settings);
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to update settings');
      return res.data as MealSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.MEAL_CONFIG, roomId, session?.user?.id], (old: any) => ({ ...old, settings: data }));
      toast.success('Meal settings updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const updateAutoMealSettings = useMutation<AutoMealSettings, Error, Partial<AutoMealSettings>>({
    mutationFn: async (settings) => {
      const res = await updateAutoMealSettingsAction(roomId!, session?.user?.id as string, settings);
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to update auto-meal settings');
      return res.data as AutoMealSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.MEAL_CONFIG, roomId, session?.user?.id], (old: any) => ({ ...old, autoSettings: data }));
      toast.success('Auto-meal settings updated');
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    mealSettings: config.settings,
    autoMealSettings: config.autoSettings,
    isLoading,
    updateMealSettings,
    updateAutoMealSettings,
  };
}
