import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { useCallback, useMemo } from 'react';
import { Role } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { isValidId } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface UseGroupAccessProps {
  groupId: string;
  onLoading?: (loading: boolean) => void;
  onError?: (error: string | null) => void;
  onGroupData?: (data: any) => void;
  initialData?: any;
}

interface UseGroupAccessReturn {
  isLoading: boolean;
  error: string | null;
  isMember: boolean;
  userRole: string | null;
  permissions: string[];
  canAccess: boolean;
  isInviteToken: boolean;
  actualGroupId: string | null;
}

interface GroupAccessData {
  isMember: boolean;
  userRole: string | null;
  permissions?: string[];
  canAccess: boolean;
  actualGroupId: string | null;
  groupData?: any;
}

// Helper function to check if a string looks like an invite token
function checkIsInviteToken(token: string): boolean {
  // Invite tokens are 10 characters long and contain a mix of letters, numbers, and special characters
  // They are not UUIDs
  return token.length === 10 && !isValidId(token);
}

export function useGroupAccess({
  groupId,
  onLoading,
  onError,
  onGroupData,
  initialData
}: UseGroupAccessProps): UseGroupAccessReturn {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Determine if this is an invite token
  const isInviteToken = useMemo(() => checkIsInviteToken(groupId), [groupId]);

  // Fetch group access data using React Query
  const {
    data: accessData,
    isLoading,
    error: queryError
  } = useQuery<GroupAccessData, Error>({
    queryKey: ['group-access', groupId],
    queryFn: async () => {
      if (!groupId) {
        throw new Error('No group ID provided');
      }

      // Check if this is an invite token
      if (checkIsInviteToken(groupId)) {
        // For invite tokens, fetch token details
        const tokenResponse = await fetch(`/api/groups/join/${groupId}`, { cache: 'no-store' });
        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(tokenData.error || 'Invalid or expired invite token');
        }

        return {
          isMember: tokenData.data?.isMember || false,
          userRole: tokenData.data?.role || null,
          canAccess: true,
          actualGroupId: tokenData.data?.groupId || null,
          groupData: tokenData.data,
        };
      }

      // For regular group IDs, validate as UUID
      if (!isValidId(groupId)) {
        throw new Error('Invalid group ID format. Please check the URL and try again.');
      }

      // Regular group access check
      const groupResponse = await fetch(`/api/groups/${groupId}/access`, { cache: 'no-store' });
      const groupData = await groupResponse.json();

      if (!groupResponse.ok) {
        throw new Error(groupData.error || 'Failed to check group access');
      }

      return {
        isMember: groupData.isMember,
        userRole: groupData.userRole,
        permissions: groupData.permissions || [],
        canAccess: groupData.canAccess,
        actualGroupId: groupId,
        groupData,
      };
    },
    enabled: !!groupId && status !== 'loading',
    initialData: initialData && initialData.groupId === groupId ? initialData : undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes - access permissions don't change frequently
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Call callbacks when loading state changes
  const loadingState = isLoading || status === 'loading';
  if (onLoading) {
    onLoading(loadingState);
  }

  // Call callbacks when error changes
  const errorMessage = queryError?.message || null;
  if (onError) {
    onError(errorMessage);
  }

  // Call callback when group data is available
  if (onGroupData && accessData?.groupData) {
    onGroupData(accessData.groupData);
  }

  return {
    isLoading: loadingState,
    error: errorMessage,
    isMember: accessData?.isMember || false,
    userRole: accessData?.userRole || null,
    permissions: accessData?.permissions || [],
    canAccess: accessData?.canAccess || false,
    isInviteToken,
    actualGroupId: accessData?.actualGroupId || null,
  };
}