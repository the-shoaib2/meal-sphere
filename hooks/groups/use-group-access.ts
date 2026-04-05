import { useQuery } from '@tanstack/react-query';
import { useSession } from "next-auth/react";
import { useMemo } from 'react';
import { isValidId } from '@/lib/utils';
import { getGroupAccessAction } from '@/lib/actions/group.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface GroupAccessData {
  isMember: boolean;
  userRole: string | null;
  permissions?: string[];
  canAccess: boolean;
  actualGroupId: string | null;
  groupData?: any;
}

/**
 * Hook for validating group access, membership, and invite tokens.
 */
export function useGroupAccess(groupId?: string) {
  const { status } = useSession();

  const isInviteToken = useMemo(() => {
    if (!groupId) return false;
    return groupId.length === 10 && !isValidId(groupId);
  }, [groupId]);

  const query = useQuery<GroupAccessData, Error>({
    queryKey: [QUERY_KEYS.GROUP_ACCESS, groupId],
    queryFn: async () => {
      if (!groupId) throw new Error('No group ID provided');

      if (isInviteToken) {
        const res = await fetch(`/api/groups/join/${groupId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid or expired invite token');

        return {
          isMember: data.data?.isMember || false,
          userRole: data.data?.role || null,
          canAccess: true,
          actualGroupId: data.data?.groupId || null,
          groupData: data.data,
        };
      }

      if (!isValidId(groupId)) throw new Error('Invalid group ID format');

      const result = await getGroupAccessAction(groupId);
      if (!result.success) throw new Error(result.message || 'Access denied');

      return {
        isMember: result.isMember ?? false,
        userRole: result.userRole ?? null,
        permissions: result.permissions || [],
        canAccess: result.canAccess ?? false,
        actualGroupId: groupId,
      };
    },
    enabled: !!groupId && status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    isInviteToken,
    accessData: query.data,
  };
}
