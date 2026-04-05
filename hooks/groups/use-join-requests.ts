import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { 
  getJoinRequestsAction, 
  handleJoinRequestAction 
} from '@/lib/actions/group.actions';
import { JoinRequest } from '@/types/group';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface HandleJoinRequestInput {
  groupId: string;
  requestId: string;
  action: 'approve' | 'reject';
}

/**
 * Hook for managing join requests.
 */
export function useJoinRequests(groupId: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Query Join Requests
  const { data: joinRequests = [], isLoading, error } = useQuery<JoinRequest[], Error>({
    queryKey: [QUERY_KEYS.JOIN_REQUESTS, groupId],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
        const result = await getJoinRequestsAction(groupId);
        if (!result.success) throw new Error(result.message || 'Failed to fetch join requests');
        return result.joinRequests as any;
      } catch (error) {
        console.error(`Error fetching join requests for group ${groupId}:`, error);
        throw new Error('Failed to fetch join requests');
      }
    },
    enabled: !!session?.user?.id && !!groupId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Handle Join Request Mutation
  const handleJoinRequest = useMutation<void, Error, HandleJoinRequestInput>({
    mutationFn: async ({ groupId, requestId, action }) => {
      const result = await handleJoinRequestAction(groupId, requestId, action);
      if (!result.success) throw new Error(result.message || 'Failed to handle join request');
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOIN_REQUESTS, groupId] });
      toast.success('Join request handled successfully');
    },
    onError: (error: Error) => {
      console.error('Error handling join request:', error);
      toast.error(error.message || 'Failed to handle join request');
    },
  });

  // Reset join request status for cache management
  const resetJoinRequestStatus = (groupId: string) => {
    queryClient.setQueryData([QUERY_KEYS.JOIN_REQUEST_STATUS, groupId], null);
    queryClient.removeQueries({ queryKey: [QUERY_KEYS.JOIN_REQUEST_STATUS, groupId] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOIN_REQUEST_STATUS, groupId] });
  };

  return {
    joinRequests,
    isLoading,
    error,
    handleJoinRequest,
    resetJoinRequestStatus,
  };
}
