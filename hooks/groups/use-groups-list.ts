import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getGroupsListAction } from '@/lib/actions/group.actions';
import { Group } from '@/types/group';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

export type GroupFilter = 'my' | 'public' | 'all';

interface UseGroupsListOptions {
  filter: GroupFilter;
  initialData?: Group[];
}

/**
 * Hook for fetching lists of groups with optional filtering.
 */
export function useGroupsList({ filter, initialData }: UseGroupsListOptions) {
  const { data: session, status } = useSession();

  const query = useQuery<Group[], Error>({
    queryKey: [QUERY_KEYS.GROUPS, filter],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
        const result = await getGroupsListAction(filter);
        if (!result.success || !result.groups) {
          throw new Error(result.message || `Failed to fetch ${filter} groups`);
        }
        return result.groups as unknown as Group[];
      } catch (error) {
        console.error(`Error fetching ${filter} groups:`, error);
        throw new Error(`Failed to fetch ${filter} groups`);
      }
    },
    enabled: !!session?.user?.id && !!filter && status === 'authenticated',
    initialData: initialData,
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error || null,
    refetch: query.refetch,
  };
}

/**
 * Convenience hook for fetching the current user's groups.
 */
export function useMyGroups() {
  const { data: session, status } = useSession();

  return useQuery<Group[], Error>({
    queryKey: [QUERY_KEYS.USER_GROUPS, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
        const result = await getGroupsListAction('my');
        if (!result.success || !result.groups) {
          throw new Error(result.message || 'Failed to fetch your groups');
        }
        return result.groups as unknown as Group[];
      } catch (error) {
        console.error('Error fetching user groups:', error);
        throw new Error('Failed to fetch your groups');
      }
    },
    enabled: !!session?.user?.id && status === 'authenticated',
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
