import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { 
  getUserRoomsAction, 
  getAnalyticsAction, 
  getRoomAnalyticsAction, 
  getAllRoomsAnalyticsAction 
} from '@/lib/actions/analytics.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export interface AnalyticsData {
  meals: any[];
  guestMeals: any[];
  expenses: any[];
  shoppingItems: any[];
  calculations: any[];
  mealDistribution: any[];
  expenseDistribution: any[];
  monthlyExpenses: any[];
  mealRateTrend: any[];
  roomStats: any[];
}

/**
 * Hook for fetching user's rooms for analytics filtering.
 */
export function useAnalyticsRooms() {
  const { data: session } = useSession();

  return useQuery<any[]>({
    queryKey: [QUERY_KEYS.GROUP_STATS, 'rooms'],
    queryFn: async () => {
      if (!session?.user?.id) throw new Error('User not authenticated');
      return await getUserRoomsAction();
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for fetching general or group-specific analytics.
 */
export function useGroupAnalytics(groupId?: string) {
  const { status } = useSession();

  return useQuery<AnalyticsData, Error>({
    queryKey: [QUERY_KEYS.GROUP_STATS, groupId || 'all'],
    queryFn: async () => {
      return await getAnalyticsAction(groupId || 'all') as unknown as AnalyticsData;
    },
    enabled: status === 'authenticated',
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for fetching detailed room analytics.
 */
export function useRoomAnalytics(roomId: string) {
  const { status } = useSession();

  return useQuery<AnalyticsData, Error>({
    queryKey: [QUERY_KEYS.GROUP_STATS, 'details', roomId],
    queryFn: async () => {
      if (!roomId) throw new Error('Room ID is required');
      return await getRoomAnalyticsAction(roomId) as unknown as AnalyticsData;
    },
    enabled: status === 'authenticated' && !!roomId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching aggregated analytics across all rooms.
 */
export function useAllAnalytics() {
  const { status } = useSession();

  return useQuery<AnalyticsData, Error>({
    queryKey: [QUERY_KEYS.GROUP_STATS, 'all'],
    queryFn: async () => {
      return await getAllRoomsAnalyticsAction() as unknown as AnalyticsData;
    },
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });
}
