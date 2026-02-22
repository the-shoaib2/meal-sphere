import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useCurrentPeriod } from '@/hooks/use-periods';

export interface UserMealSummary {
  userId: string;
  userName: string;
  userImage?: string;
  mealCount: number;
  cost: number;
  paid: number;
  balance: number;
}

export interface RoomMealSummary {
  totalMeals: number;
  totalCost: number;
  mealRate: number;
  userSummaries: UserMealSummary[];
  startDate: string;
  endDate: string;
}

export interface MealSummary {
  startDate: string;
  endDate: string;
}

export interface CalculationsPageData {
  groupBalanceSummary: any;
  userBalance: any;
  memberBalances: any[];
  mealRateInfo: any;
  payments: any[];
  currentPeriod: any;
  roomData: any;
  userRole: string | null;
  groupId?: string;
}

interface CalculationParams {
  roomId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  dependencies?: any[];
}

export function useRoomCalculations({
  roomId,
  startDate,
  endDate,
  enabled = true,
  dependencies = [],
  initialData
}: CalculationParams & { initialData?: CalculationsPageData } = {}) {
  const { data: session } = useSession();
  const { data: currentPeriod } = useCurrentPeriod();

  // Mapping CalculationsPageData to RoomMealSummary
  const effectiveInitialData = useMemo(() => {
    if (!initialData || initialData.groupId !== roomId) return undefined;
    
    return {
      totalMeals: initialData.mealRateInfo?.totalMeals || 0,
      totalCost: initialData.mealRateInfo?.totalExpenses || 0,
      mealRate: initialData.mealRateInfo?.mealRate || 0,
      startDate: initialData.currentPeriod?.startDate || '',
      endDate: initialData.currentPeriod?.endDate || '',
      userSummaries: (initialData.memberBalances || []).map(m => ({
        userId: m.userId,
        userName: m.user?.name || 'Unknown',
        userImage: m.user?.image,
        mealCount: m.mealCount || 0,
        cost: m.totalSpent || 0,
        paid: m.balance || 0, // In this app's context, balance often means paid/received
        balance: m.availableBalance || 0
      }))
    } as RoomMealSummary;
  }, [initialData, roomId]);

  // Memoize resolved room ID to prevent unnecessary re-renders
  const resolvedRoomId = useMemo(() => {
    return roomId || currentPeriod?.groupId || currentPeriod?.roomId;
  }, [roomId, currentPeriod?.groupId, currentPeriod?.roomId]);

  // Memoize query key to prevent unnecessary refetches
  const queryKey = useMemo(() => [
    'room-calculations',
    resolvedRoomId,
    startDate?.toISOString(),
    endDate?.toISOString(),
    ...dependencies
  ], [resolvedRoomId, startDate?.toISOString(), endDate?.toISOString(), dependencies]);

  // Memoize enabled condition
  const isEnabled = useMemo(() => {
    return enabled && !!session?.user?.id && !!resolvedRoomId;
  }, [enabled, session?.user?.id, resolvedRoomId]);

  return useQuery<RoomMealSummary>({
    queryKey,
    queryFn: async () => {
      if (!session?.user?.id || !resolvedRoomId) {
        throw new Error('User or group not available');
      }

      const { getCalculationsAction } = await import('@/lib/actions/calculation.actions');
      const res = await getCalculationsAction(
        resolvedRoomId,
        undefined,
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      if (!res.success) throw new Error(res.message);
      return res.summary as unknown as RoomMealSummary;
    },
    enabled: isEnabled && !effectiveInitialData,
    initialData: effectiveInitialData,
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

interface UserCalculationParams {
  userId: string;
  roomId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  dependencies?: any[];
}

export function useUserCalculations({
  userId,
  roomId,
  startDate,
  endDate,
  enabled = true,
  dependencies = []
}: UserCalculationParams) {
  const { data: session } = useSession();
  const { data: currentPeriod } = useCurrentPeriod();

  // Memoize resolved room ID
  const resolvedRoomId = useMemo(() => {
    return roomId || currentPeriod?.groupId || currentPeriod?.roomId;
  }, [roomId, currentPeriod?.groupId, currentPeriod?.roomId]);

  // Memoize query key
  const queryKey = useMemo(() => [
    'user-calculations',
    userId,
    resolvedRoomId,
    startDate?.toISOString(),
    endDate?.toISOString(),
    ...dependencies
  ], [userId, resolvedRoomId, startDate?.toISOString(), endDate?.toISOString(), dependencies]);

  // Memoize enabled condition
  const isEnabled = useMemo(() => {
    return enabled && !!session?.user?.id && !!resolvedRoomId && !!userId;
  }, [enabled, session?.user?.id, resolvedRoomId, userId]);

  return useQuery<MealSummary>({
    queryKey,
    queryFn: async () => {
      if (!session?.user?.id || !resolvedRoomId || !userId) {
        throw new Error('User, group, or userId not available');
      }

      const { getCalculationsAction } = await import('@/lib/actions/calculation.actions');
      const res = await getCalculationsAction(
        resolvedRoomId,
        userId,
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      if (!res.success) throw new Error(res.message);
      return res.summary as unknown as MealSummary;
    },
    enabled: isEnabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
} 