import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';

export interface AnalyticsData {
  meals: MealData[];
  expenses: ExpenseData[];
  shoppingItems: ShoppingItemData[];
  calculations: CalculationData[];
  mealDistribution: MealDistributionData[];
  expenseDistribution: ExpenseDistributionData[];
  monthlyExpenses: MonthlyExpenseData[];
  mealRateTrend: MealRateTrendData[];
  roomStats: RoomStatsData[];
}

export interface MealData {
  id: string;
  date: string;
  type: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  roomId: string;
  room: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  roomId: string;
  room: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export interface ShoppingItemData {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  purchased: boolean;
  date: string;
  roomId: string;
  room: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export interface CalculationData {
  id: string;
  roomId: string;
  roomName: string;
  startDate: string;
  endDate: string;
  totalMeals: number;
  totalExpense: number;
  mealRate: number;
  memberCount: number;
}

export interface MealDistributionData {
  name: string;
  value: number;
  color: string;
}

export interface ExpenseDistributionData {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyExpenseData {
  name: string;
  value: number;
  color: string;
}

export interface MealRateTrendData {
  name: string;
  value: number;
  color: string;
}

export interface RoomStatsData {
  roomId: string;
  roomName: string;
  totalMeals: number;
  totalExpenses: number;
  averageMealRate: number;
  memberCount: number;
  activeDays: number;
}

export interface UserRoom {
  id: string;
  name: string;
  memberCount: number;
}

export function useUserRooms() {
  const { data: session } = useSession();

  return useQuery<UserRoom[]>({
    queryKey: ['user-rooms'],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const { data } = await axios.get<UserRoom[]>('/api/analytics/user-rooms');
        return data;
      } catch (error) {
        console.error('Error fetching user rooms:', error);
        throw new Error('Failed to fetch user rooms');
      }
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false
  });
}

export function useAnalytics() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  return useQuery<AnalyticsData>({
    queryKey: ['analytics', activeGroup?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const { data } = await axios.get<AnalyticsData>('/api/analytics', {
          params: {
            groupId: activeGroup?.id || 'all'
          }
        });
        return data;
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw new Error('Failed to fetch analytics data');
      }
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - analytics data changes slowly
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnWindowFocus: false
  });
}

export function useSelectedRoomsAnalytics(selectedRoomIds: string[]) {
  const { data: session } = useSession();

  return useQuery<AnalyticsData>({
    queryKey: ['selected-rooms-analytics', selectedRoomIds],
    queryFn: async () => {
      if (!session?.user?.id || selectedRoomIds.length === 0) {
        throw new Error('User not authenticated or no rooms selected');
      }

      try {
        const { data } = await axios.get<AnalyticsData>('/api/analytics/selected-rooms', {
          params: {
            roomIds: selectedRoomIds.join(',')
          }
        });
        return data;
      } catch (error) {
        console.error('Error fetching selected rooms analytics data:', error);
        throw new Error('Failed to fetch selected rooms analytics data');
      }
    },
    enabled: !!session?.user?.id && selectedRoomIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}

export function useRoomAnalytics(roomId?: string) {
  const { data: session } = useSession();

  return useQuery<AnalyticsData>({
    queryKey: ['room-analytics', roomId],
    queryFn: async () => {
      if (!session?.user?.id || !roomId) {
        throw new Error('User not authenticated or room ID not provided');
      }

      try {
        const { data } = await axios.get<AnalyticsData>(`/api/analytics/room/${roomId}`);
        return data;
      } catch (error) {
        console.error('Error fetching room analytics data:', error);
        throw new Error('Failed to fetch room analytics data');
      }
    },
    enabled: !!session?.user?.id && !!roomId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}

export function useAllRoomsAnalytics() {
  const { data: session } = useSession();

  return useQuery<AnalyticsData>({
    queryKey: ['all-rooms-analytics'],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const { data } = await axios.get<AnalyticsData>('/api/analytics/all-rooms');
        return data;
      } catch (error) {
        console.error('Error fetching all rooms analytics data:', error);
        throw new Error('Failed to fetch all rooms analytics data');
      }
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
} 