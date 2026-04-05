import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { 
  joinGroupAction, 
  leaveGroupAction 
} from '@/lib/actions/group.actions';
import { Group } from '@/types/group';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface JoinGroupInput {
  groupId?: string;
  inviteToken?: string;
  password?: string;
}

/**
 * Hook for managing group membership (Join, Leave).
 */
export function useGroupMembership() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();

  // Join a group
  const joinGroup = useMutation<void, Error, JoinGroupInput>({
    mutationFn: async ({ groupId, inviteToken, password }) => {
      const result = await joinGroupAction({ groupId, token: inviteToken, password });
      if (!result.success) throw new Error(result.message || 'Failed to join group');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_GROUPS, session?.user?.id] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUPS] }),
      ]);
      
      router.refresh();
      toast.success('Successfully joined the group!');
    },
    onError: (error: Error) => {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
      throw error;
    },
  });

  // Leave a group
  const leaveGroup = useMutation<void, Error, string>({
    mutationFn: async (groupId: string) => {
      const result = await leaveGroupAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to leave group');
    },
    onMutate: async (groupId: string) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS, groupId] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.USER_GROUPS, session?.user?.id] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GROUPS] });
      
      const previousGroup = queryClient.getQueryData<Group>([QUERY_KEYS.GROUP_DETAILS, groupId]);
      const previousGroups = queryClient.getQueryData<Group[]>([QUERY_KEYS.USER_GROUPS, session?.user?.id]);

      if (previousGroup) {
        queryClient.setQueryData([QUERY_KEYS.GROUP_DETAILS, groupId], {
          ...previousGroup,
          members: previousGroup.members?.filter(m => m.userId !== session?.user?.id) || []
        });
      }

      if (Array.isArray(previousGroups)) {
        queryClient.setQueryData([QUERY_KEYS.USER_GROUPS, session?.user?.id],
          previousGroups.filter(g => g.id !== groupId)
        );
      }

      return { previousGroup, previousGroups };
    },
    onSuccess: async (_, groupId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_GROUPS, session?.user?.id] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUPS] }),
      ]);

      queryClient.removeQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS, groupId] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.JOIN_REQUESTS, groupId] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.GROUP_MEMBERS, groupId] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.GROUP_ACTIVITIES, groupId] });

      toast.success('You have left the group successfully');
    },
    onError: (error: Error, groupId: string, context: any) => {
      console.error('Error leaving group:', error);
      const errorMessage = error.message || 'Failed to leave group';

      if (errorMessage.includes('CREATOR_CANNOT_LEAVE')) {
        toast.error('You must transfer the Admin role to another member before leaving the group.');
      } else {
        toast.error(errorMessage);
      }

      if (context?.previousGroup) {
        queryClient.setQueryData([QUERY_KEYS.GROUP_DETAILS, groupId], context.previousGroup);
      }
      if (context?.previousGroups) {
        queryClient.setQueryData([QUERY_KEYS.USER_GROUPS, session?.user?.id], context.previousGroups);
      }
    },
  });

  return {
    joinGroup,
    leaveGroup,
  };
}
