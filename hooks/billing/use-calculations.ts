import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

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

interface CalculationParams {
  roomId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

/**
 * Hook for fetching room-wide meal calculations and member balances.
 */
export function useRoomCalculations({
  roomId,
  startDate,
  endDate,
  enabled = true
}: CalculationParams = {}) {
  const { data: session } = useSession();

  return useQuery<RoomMealSummary, Error>({
    queryKey: [QUERY_KEYS.CALCULATIONS, roomId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!roomId) throw new Error('Room ID is required');

      const { getCalculationsAction } = await import('@/lib/actions/calculation.actions');
      const res = await getCalculationsAction(
        roomId,
        undefined,
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      if (!res.success || !res.summary) throw new Error(res.message || 'Failed to fetch calculations');
      return res.summary as unknown as RoomMealSummary;
    },
    enabled: enabled && !!(session?.user as any)?.id && !!roomId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching individual user meal calculations for a specific room.
 */
export function useUserCalculations({
  userId,
  roomId,
  startDate,
  endDate,
  enabled = true
}: CalculationParams & { userId?: string }) {
  const { data: session } = useSession();
  const targetUserId = userId || session?.user?.id;

  return useQuery<any, Error>({
    queryKey: [QUERY_KEYS.CALCULATIONS, 'user', targetUserId, roomId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!roomId || !targetUserId) throw new Error('Room ID and User ID are required');

      const { getCalculationsAction } = await import('@/lib/actions/calculation.actions');
      const res = await getCalculationsAction(
        roomId,
        targetUserId,
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      if (!res.success || !res.summary) throw new Error(res.message || 'Failed to fetch user calculations');
      return res.summary;
    },
    enabled: enabled && !!targetUserId && !!roomId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
