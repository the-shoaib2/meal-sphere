import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { 
  createGroupAction, 
  updateGroupAction, 
  deleteGroupAction 
} from '@/lib/actions/group.actions';
import { Group } from '@/types/group';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface CreateGroupInput {
  name: string;
  description?: string;
  isPrivate?: boolean;
  password?: string;
  maxMembers?: number;
  bannerUrl?: string; 
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  password?: string | null;
  maxMembers?: number | null;
  tags?: string[];
  features?: Record<string, boolean>;
  bannerUrl?: string | null;
}

/**
 * Hook for group mutations (Create, Update, Delete).
 */
export function useGroupMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();

  // Create Group
  const createGroup = useMutation<Group, Error, CreateGroupInput>({
    mutationFn: async (groupData: CreateGroupInput) => {
      const result = await createGroupAction({
        ...groupData,
        isPrivate: groupData.isPrivate ?? false
      });
      if (!result.success || !result.group) throw new Error(result.message || 'Failed to create group');
      return result.group as unknown as Group;
    },
    onSuccess: async (data: Group) => {
      queryClient.setQueryData([QUERY_KEYS.USER_GROUPS, session?.user?.id], (old: Group[] = []) => [data, ...old]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUPS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_GROUPS] }),
      ]);
      toast.success('Group created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    },
  });

  // Update Group
  const updateGroup = useMutation<Group, Error, { groupId: string; data: UpdateGroupInput }>({
    mutationFn: async ({ groupId, data }) => {
      const result = await updateGroupAction(groupId, {
        ...data,
        maxMembers: data.maxMembers === null ? undefined : data.maxMembers,
      });
      if (!result.success || !result.group) throw new Error(result.message || 'Failed to update group');
      return result.group as unknown as Group;
    },
    onMutate: async ({ groupId, data: updateData }) => {
      const currentUserId = session?.user?.id;
      if (currentUserId) {
        await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.USER_GROUPS, currentUserId] });
      }
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GROUPS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.GROUP_DETAILS, groupId] });

      const previousGroupDetails = queryClient.getQueryData<Group>([QUERY_KEYS.GROUP_DETAILS, groupId]);
      
      if (previousGroupDetails) {
        queryClient.setQueryData([QUERY_KEYS.GROUP_DETAILS, groupId], { ...previousGroupDetails, ...updateData });
      }

      return { previousGroupDetails };
    },
    onSuccess: async (data: Group) => {
      toast.success('Group updated successfully');
      queryClient.setQueryData([QUERY_KEYS.GROUP_DETAILS, data.id], data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUPS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_GROUPS] }),
      ]);
    },
    onError: (error: Error, variables, context: any) => {
      console.error('Error updating group:', error);
      if (context?.previousGroupDetails) {
        queryClient.setQueryData([QUERY_KEYS.GROUP_DETAILS, variables.groupId], context.previousGroupDetails);
      }
      toast.error(error.message || 'Failed to update group');
    },
  });

  // Delete Group
  const deleteGroup = useMutation<void, Error, string>({
    mutationFn: async (groupId: string) => {
      const result = await deleteGroupAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to delete group');
    },
    onSuccess: async () => {
      toast.success('Group deleted successfully');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GROUPS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_GROUPS] }),
      ]);
      router.push('/groups');
    },
    onError: (error: Error) => {
      console.error('Error deleting group:', error);
      toast.error(error.message || 'Failed to delete group');
    },
  });

  return {
    createGroup,
    updateGroup,
    deleteGroup,
  };
}
