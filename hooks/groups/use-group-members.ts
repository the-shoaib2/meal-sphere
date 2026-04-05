import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Role } from '@prisma/client';
import { 
  removeMemberAction, 
  updateMemberRoleAction, 
  getGroupDetailsAction 
} from '@/lib/actions/group.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/**
 * Hook for managing group members (Listing, Removing, Changing Roles).
 */
export function useGroupMembers(groupId: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Query Members (Extracted from group details for individual usage)
  const { data: members = [], isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.GROUP_MEMBERS, groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const result = await getGroupDetailsAction(groupId);
      if (!result.success || !result.groupData) throw new Error(result.message || 'Failed to fetch members');
      return (result.groupData as any).members || [];
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });

  // Remove Member Mutation
  const removeMember = useMutation({
    mutationFn: async (targetMemberId: string) => {
      const result = await removeMemberAction(groupId, targetMemberId);
      if (!result.success) throw new Error(result.message || 'Failed to remove member');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_MEMBERS, groupId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS, groupId] });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update Member Role Mutation
  const updateMemberRole = useMutation({
    mutationFn: async ({ targetMemberId, newRole }: { targetMemberId: string; newRole: Role }) => {
      const result = await updateMemberRoleAction(groupId, targetMemberId, newRole);
      if (!result.success) throw new Error(result.message || 'Failed to update role');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_MEMBERS, groupId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS, groupId] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    members,
    isLoading,
    error,
    removeMember,
    updateMemberRole,
  };
}
