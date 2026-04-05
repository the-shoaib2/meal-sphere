import { useCallback } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getGroupDetailsAction, getGroupStatsAction } from '@/lib/actions/group.actions';
import { Group } from '@/types/group';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/**
 * Custom error class for private group password requirements.
 */
export class GroupAccessError extends Error {
  requiresPassword?: boolean;
  group?: any;
  status?: number;
  code?: string;

  constructor(message: string, options?: Partial<GroupAccessError>) {
    super(message);
    Object.assign(this, options);
  }
}

/**
 * Hook for fetching details of a specific group.
 */
export function useGroupDetails(groupId: string, initialData?: any, password?: string): UseQueryResult<Group, GroupAccessError> {
  const hasInitialData = !!initialData;

  const fetchGroupDetails = useCallback(async (id: string, groupPassword?: string): Promise<Group> => {
    try {
      const result = await getGroupDetailsAction(id, groupPassword);
      const responseData = result.groupData as any;

      if (result.status === 403 || result.requiresPassword) {
        throw new GroupAccessError('This is a private group. A password is required.', {
          requiresPassword: true,
          group: responseData || {},
          status: 403,
          code: 'PRIVATE_GROUP',
        });
      }

      if (result.status === 401) {
        throw new GroupAccessError('Invalid password', {
          code: 'INVALID_PASSWORD',
        });
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch group details');
      }

      return responseData;
    } catch (error: any) {
      if (error instanceof GroupAccessError) throw error;
      throw new Error(error?.message || 'Failed to fetch group details');
    }
  }, []);

  return useQuery<Group, GroupAccessError>({
    queryKey: [QUERY_KEYS.GROUP_DETAILS, groupId],
    queryFn: () => {
      if (hasInitialData) return initialData;
      if (!groupId) throw new Error('Group ID is required');
      return fetchGroupDetails(groupId, password);
    },
    enabled: !!groupId && !initialData,
    initialData: initialData,
    staleTime: initialData ? Infinity : 10 * 60 * 1000,
    gcTime: initialData ? Infinity : 30 * 60 * 1000,
    refetchOnWindowFocus: !hasInitialData,
    refetchOnMount: !hasInitialData,
    refetchOnReconnect: !hasInitialData,
    retry: (failureCount, error: any) => {
      if (error?.requiresPassword) return false;
      return failureCount < 3;
    },
  });
}

/**
 * Hook for fetching group statistics.
 */
export function useGroupStats(groupId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.GROUP_STATS, groupId],
    queryFn: async () => {
      const result = await getGroupStatsAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to fetch group stats');
      return result.stats;
    },
    enabled: !!groupId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
