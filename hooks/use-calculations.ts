import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';
import { useMemo } from 'react';

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
  totalMeals: number;
  totalCost: number;
  mealRate: number;
  userMeals: number;
  userCost: number;
  startDate: string;
  endDate: string;
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
  dependencies = [] 
}: CalculationParams = {}) {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  // Memoize resolved room ID to prevent unnecessary re-renders
  const resolvedRoomId = useMemo(() => {
    return roomId || activeGroup?.id;
  }, [roomId, activeGroup?.id]);

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
      
      const params = {
        roomId: resolvedRoomId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      };

      const { data } = await axios.get<RoomMealSummary>('/api/calculations', { params });
      return data;
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
  const { activeGroup } = useActiveGroup();
  
  // Memoize resolved room ID
  const resolvedRoomId = useMemo(() => {
    return roomId || activeGroup?.id;
  }, [roomId, activeGroup?.id]);

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
      
      const params = {
        roomId: resolvedRoomId,
        userId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      };

      const { data } = await axios.get<MealSummary>('/api/calculations', { params });
      return data;
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
} 