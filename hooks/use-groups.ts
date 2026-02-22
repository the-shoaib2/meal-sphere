import { useCallback } from 'react';
import { 
  useMutation, 
  useQuery, 
  useQueryClient, 
  UseQueryResult 
} from '@tanstack/react-query';
import axios from 'axios';
import { 
  createGroupAction, 
  updateGroupAction, 
  deleteGroupAction, 
  joinGroupAction, 
  leaveGroupAction, 
  updatePeriodModeAction, 
  handleJoinRequestAction, 
  getGroupStatsAction, 
  getGroupsListAction, 
  getGroupDetailsAction, 
  getJoinRequestsAction } from '@/lib/actions/group.actions';

type AxiosError<T = any> = {
  response?: {
    data: T;
    status: number;
    statusText: string;
    headers: any;
  };
  request?: any;
  message: string;
  config: any;
  code?: string;
};

type JoinGroupInput = {
  groupId?: string;
  inviteToken?: string;
  password?: string;
};

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Group, JoinRequest } from '@/types/group';


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


interface UseGroupsReturn {
  data: Group[];
  isLoading: boolean;
  error: Error | null;
  useGroupsList: (options: { filter: 'my' | 'public' | 'all'; initialData?: Group[] }) => {
    data: Group[];
    isLoading: boolean;
    error: Error | null;
  };
  useGroupDetails: (groupId: string, initialData?: any, password?: string) => UseQueryResult<Group, Error>;
  getGroupDetails: (groupId: string, password?: string) => Promise<Group>;
  createGroup: ReturnType<typeof useMutation<Group, Error, CreateGroupInput>>;
  updateGroup: ReturnType<typeof useMutation<Group, Error, { groupId: string; data: UpdateGroupInput }>>;
  joinGroup: ReturnType<typeof useMutation<void, Error, JoinGroupInput>>;
  leaveGroup: ReturnType<typeof useMutation<void, Error, string>>;
  deleteGroup: ReturnType<typeof useMutation<void, Error, { groupId: string }, { 
    previousUserGroups: Group[] | undefined;
    previousMyGroups: Group[] | undefined;
    previousPublicGroups: Group[] | undefined;
    previousAllGroups: Group[] | undefined;
  }>>;
  useJoinRequests: (groupId: string) => {
    data: JoinRequest[];
    isLoading: boolean;
    error: Error | null;
  };
  handleJoinRequest: ReturnType<typeof useMutation<void, Error, { groupId: string; requestId: string; action: 'approve' | 'reject' }>>;
  resetJoinRequestStatus: (groupId: string) => void;
  updatePeriodMode: ReturnType<typeof useMutation<{ periodMode: string }, Error, { groupId: string; mode: 'MONTHLY' | 'CUSTOM' }>>;
  useGroupStats: (groupId: string, enabled?: boolean) => UseQueryResult<any, Error>;
}

export function useGroups(): UseGroupsReturn {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Get user's groups - always define the query, but use enabled to control execution
  const { data: userGroups = [], isLoading: isLoadingGroups, error } = useQuery<Group[], Error>({
    queryKey: ['user-groups', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      try {
        const result = await getGroupsListAction('my');
        if (!result.success || !result.groups) throw new Error(result.message || 'Failed to fetch groups');
        
        // Set the data in React Query cache for future use
        queryClient.setQueryData(['user-groups', session.user.id], result.groups);
        return result.groups as Group[];
      } catch (error: unknown) {
        console.error('Error fetching user groups:', error);
        throw new Error('Failed to fetch groups');
      }
    },
    enabled: !!session?.user?.id && status === 'authenticated',
    staleTime: 5 * 60 * 1000, // 5 minutes (changed from Infinity)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (failureCount >= 1) return false;
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return true;
    }
  });

  // Determine if we should show loading state
  const isLoading = status === 'loading' || isLoadingGroups;

  // Get groups list based on filter
  const useGroupsList = ({ filter, initialData }: { filter: 'my' | 'public' | 'all'; initialData?: Group[] }) => {
    const { data: groupsList = [], isLoading: listLoading, error: listError } = useQuery<Group[], Error>({
      queryKey: ['groups', filter],
      queryFn: async () => {
        if (!session?.user?.id) return [];
        try {
          const result = await getGroupsListAction(filter);
          if (!result.success || !result.groups) throw new Error(result.message || `Failed to fetch ${filter} groups`);
          return result.groups as unknown as Group[];
        } catch (error) {
          console.error(`Error fetching ${filter} groups:`, error);
          throw new Error(`Failed to fetch ${filter} groups`);
        }
      },
      enabled: !!session?.user?.id && !!filter,
      // Use placeholderData instead of initialData so React Query always
      // refetches fresh data on mount, while showing server data as placeholder
      placeholderData: initialData,
      staleTime: 0, // Always consider data stale so it refetches on mount
      refetchOnMount: 'always', // Force refetch every time component mounts
      refetchOnWindowFocus: false
    });

    return {
      data: groupsList,
      isLoading: listLoading,
      error: listError || null,
    };
  };

  // Get group details
  const getGroupDetails = useCallback(async (groupId: string, password?: string): Promise<Group> => {
    try {
      const result = await getGroupDetailsAction(groupId, password);

      const responseData = result.groupData as any;

      // Handle the case where the API returns requiresPassword in the success response
      if (result.status === 403 || result.requiresPassword) {
        const error = new Error('This is a private group. A password is required.');
        (error as any).requiresPassword = true;
        (error as any).group = responseData || {};
        (error as any).status = 403;
        (error as any).code = 'PRIVATE_GROUP';
        throw error;
      }

      // Handle invalid password case
      if (result.status === 401) {
        const error = new Error('Invalid password');
        (error as any).code = 'INVALID_PASSWORD';
        throw error;
      }

      if (!result.success) {
         throw new Error(result.message || 'Failed to fetch group details');
      }

      return responseData;

    } catch (error: any) {
      // If it's already our custom error, just rethrow it
      if (error?.code === 'PRIVATE_GROUP' || error?.code === 'INVALID_PASSWORD') {
        throw error;
      }

      // Removed legacy axios error formatting since we are using server actions
      
      // For any other errors, rethrow with a generic message
      throw new Error(error?.message || 'Failed to fetch group details');
    }
  }, []);

  const useGroupDetails = (groupId: string, initialData?: any, password?: string) => {
    const hasInitialData = !!initialData;
    return useQuery<Group, Error>({
      queryKey: ['group', groupId],
      queryFn: () => {
        if (hasInitialData) return initialData; // Should not happen due to enabled: false, but safety net
        if (!groupId) throw new Error('Group ID is required');
        return getGroupDetails(groupId, password);
      },
      enabled: !!groupId && !initialData,
      initialData: initialData,
      staleTime: initialData ? Infinity : 10 * 60 * 1000, 
      gcTime: initialData ? Infinity : 30 * 60 * 1000,
      refetchOnWindowFocus: !hasInitialData,
      refetchOnMount: !hasInitialData,
      refetchOnReconnect: !hasInitialData,
      retry: (failureCount, error: any) => {
        // Don't retry if it's a password required error
        if (error?.requiresPassword) return false;
        return failureCount < 3; // Retry up to 3 times for other errors
      }
    });
  };

  // Create a new group
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
      // Optimistically add the new group to the cache
      queryClient.setQueryData(['user-groups', session?.user?.id], (old: Group[] = []) => [data, ...old]);

      // Invalidate all group lists and AWAIT to ensure cache is cleared before any navigation
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['user-groups'] }),
      ]);
    },
    onError: (error: Error) => {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    },
  });

  // Join a group
  const joinGroup = useMutation<void, Error, JoinGroupInput>({
    mutationFn: async ({ groupId, inviteToken, password }) => {
      const result = await joinGroupAction({ groupId, token: inviteToken, password });
      if (!result.success) throw new Error(result.message || 'Failed to join group');
    },
    onSuccess: async () => {
      // Complete cache invalidation to sync Context and Switcher immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group'] }),
        queryClient.invalidateQueries({ queryKey: ['user-groups', session?.user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
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

  // Update a group
  const updateGroup = useMutation<Group, Error, { groupId: string; data: UpdateGroupInput }>({
    mutationFn: async ({ groupId, data }) => {
      const response = {
        ...data,
        maxMembers: data.maxMembers === null ? undefined : data.maxMembers,
      };
      const result = await updateGroupAction(groupId, response);
      if (!result.success || !result.group) throw new Error(result.message || 'Failed to update group');
      return result.group as unknown as Group;
    },
    onSuccess: async (data: Group) => {
      // Optimistically update the user-groups list
      queryClient.setQueryData(['user-groups', session?.user?.id], (old: Group[] = []) => {
        return old.map(g => g.id === data.id ? { ...g, ...data } : g);
      });
      
      // Update specific group details
      queryClient.setQueryData(['group', data.id], data);

      // Invalidate and AWAIT to ensure consistency before any navigation
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['user-groups'] }),
      ]);
    },
    onError: (error: Error) => {
      console.error('Error updating group:', error);
      toast.error(error.message || 'Failed to update group');
    },
  });

  // Define the context type for the leave group mutation
  type LeaveGroupContext = {
    previousGroup: Group | undefined;
    previousGroups: Group[] | undefined;
  };

  // Leave a group
  const leaveGroup = useMutation<void, Error, string, LeaveGroupContext>({
    mutationFn: async (groupId: string) => {
      const result = await leaveGroupAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to leave group');
    },
    onMutate: async (groupId: string): Promise<LeaveGroupContext> => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['user-groups', session?.user?.id] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'my'] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'public'] });
      await queryClient.cancelQueries({ queryKey: ['join-requests', groupId] });
      await queryClient.cancelQueries({ queryKey: ['join-request-status', groupId] });

      // Snapshot the previous value
      const previousGroup = queryClient.getQueryData<Group>(['group', groupId]);
      const previousGroups = queryClient.getQueryData<Group[]>(['user-groups', session?.user?.id]);

      // Optimistically update the UI
      if (previousGroup) {
        queryClient.setQueryData(['group', groupId], {
          ...previousGroup,
          members: (previousGroup as Group).members?.filter(m => m.userId !== session?.user?.id) || []
        });
      }

      if (Array.isArray(previousGroups)) {
        queryClient.setQueryData(['user-groups', session?.user?.id],
          (previousGroups as Group[]).filter(g => g.id !== groupId)
        );
      }

      return { previousGroup, previousGroups };
    },
    onSuccess: async (_, groupId) => {
      // Comprehensive cache invalidation and clearing
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group'] }),
        queryClient.invalidateQueries({ queryKey: ['user-groups', session?.user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
      ]);

      // Remove specific group data from cache
      queryClient.removeQueries({ queryKey: ['group', groupId] });
      queryClient.removeQueries({ queryKey: ['join-requests', groupId] });
      queryClient.removeQueries({ queryKey: ['join-request-status', groupId] });
      queryClient.removeQueries({ queryKey: ['group-members', groupId] });
      queryClient.removeQueries({ queryKey: ['group-activities', groupId] });

      // Clear any join request status for this group
      queryClient.setQueryData(['join-request-status', groupId], null);

      toast.success('You have left the group successfully');
    },
    onError: (error: Error, groupId: string, context: LeaveGroupContext | undefined) => {
      console.error('Error leaving group:', error);

      const errorMessage = error.message || 'Failed to leave group';

      if (errorMessage.includes('CREATOR_CANNOT_LEAVE')) {
        toast.error('You must transfer the Admin role to another member before leaving the group.');
      } else {
        toast.error(errorMessage);
      }

      // Rollback on error
      if (context?.previousGroup) {
        queryClient.setQueryData(['group', groupId], context.previousGroup);
      }
      if (context?.previousGroups) {
        queryClient.setQueryData(['user-groups', session?.user?.id], context.previousGroups);
      }
    },
    onSettled: (data, error, groupId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-groups', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['join-request-status', groupId] });
    },
  });
  // Delete group
  const deleteGroup = useMutation<void, Error, { groupId: string }, { 
    previousUserGroups: Group[] | undefined;
    previousMyGroups: Group[] | undefined;
    previousPublicGroups: Group[] | undefined;
    previousAllGroups: Group[] | undefined;
  }>({
    mutationFn: async ({ groupId }) => {
      const result = await deleteGroupAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to delete group');
    },
    onMutate: async ({ groupId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-groups', session?.user?.id] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'my'] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'public'] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'all'] });
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });

      // Snapshot the previous values
      const previousUserGroups = queryClient.getQueryData<Group[]>(['user-groups', session?.user?.id]);
      const previousMyGroups = queryClient.getQueryData<Group[]>(['groups', 'my']);
      const previousPublicGroups = queryClient.getQueryData<Group[]>(['groups', 'public']);
      const previousAllGroups = queryClient.getQueryData<Group[]>(['groups', 'all']);

      // Optimistically update the user groups list
      if (previousUserGroups) {
        queryClient.setQueryData(['user-groups', session?.user?.id], previousUserGroups.filter(g => g.id !== groupId));
      }

      // Optimistically update the other lists
      if (previousMyGroups) {
        queryClient.setQueryData(['groups', 'my'], previousMyGroups.filter(g => g.id !== groupId));
      }
      if (previousPublicGroups) {
        queryClient.setQueryData(['groups', 'public'], previousPublicGroups.filter(g => g.id !== groupId));
      }
      if (previousAllGroups) {
        queryClient.setQueryData(['groups', 'all'], previousAllGroups.filter(g => g.id !== groupId));
      }

      // NOTE: Do NOT remove the group from cache here. 
      // Doing so causes the current page (Group Settings) to lose data and unmount/show error 
      // before the navigation in onSuccess allows us to leave the page.
      // queryClient.removeQueries({ queryKey: ['group', groupId] });

      return { previousUserGroups, previousMyGroups, previousPublicGroups, previousAllGroups };
    },
    onSuccess: async () => {
      toast.success('Group deleted successfully');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['user-groups'] }),
      ]);
      router.push('/groups');
    },
    onError: (error: Error, variables, context) => {
      console.error('Error deleting group:', error);
      // Rollback on error
      if (context?.previousUserGroups) {
        queryClient.setQueryData(['user-groups', session?.user?.id], context.previousUserGroups);
      }
      if (context?.previousMyGroups) {
        queryClient.setQueryData(['groups', 'my'], context.previousMyGroups);
      }
      if (context?.previousPublicGroups) {
        queryClient.setQueryData(['groups', 'public'], context.previousPublicGroups);
      }
      if (context?.previousAllGroups) {
        queryClient.setQueryData(['groups', 'all'], context.previousAllGroups);
      }
      toast.error(error.message || 'Failed to delete group');
    },
    onSettled: () => {
      // Only refetch user-groups to keep the session context somewhat fresh, 
      // but avoid refetching the main lists to preserve optimistic deletion
      queryClient.invalidateQueries({ queryKey: ['user-groups', session?.user?.id] });
    },
  });

  // Fetch join requests
  const useJoinRequests = (groupId: string) => {
    const { data: joinRequests = [], isLoading: isLoadingJoinRequests, error: joinRequestsError } = useQuery<JoinRequest[], Error>({
      queryKey: ['join-requests', groupId],
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
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5)
      refetchOnWindowFocus: false
    });

    return {
      data: joinRequests,
      isLoading: isLoadingJoinRequests,
      error: joinRequestsError || null,
    };
  };

  // Handle join request
  const handleJoinRequest = useMutation<void, Error, { groupId: string; requestId: string; action: 'approve' | 'reject' }>({
    mutationFn: async ({ groupId, requestId, action }) => {
      const result = await handleJoinRequestAction(groupId, requestId, action);
      if (!result.success) throw new Error(result.message || 'Failed to handle join request');
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      toast.success('Join request handled successfully');
    },
    onError: (error: Error) => {
      console.error('Error handling join request:', error);
      toast.error(error.message || 'Failed to handle join request');
    },
  });

  // Reset join request status for a specific group
  const resetJoinRequestStatus = useCallback((groupId: string) => {
    // Clear join request status from cache
    queryClient.setQueryData(['join-request-status', groupId], null);
    queryClient.removeQueries({ queryKey: ['join-request-status', groupId] });
    queryClient.invalidateQueries({ queryKey: ['join-request-status', groupId] });

    // Also clear join requests list for this group
    queryClient.removeQueries({ queryKey: ['join-requests', groupId] });
    queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
    queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
  }, [queryClient]);

  // Update Period Mode
  const updatePeriodMode = useMutation<{ periodMode: string }, Error, { groupId: string; mode: 'MONTHLY' | 'CUSTOM' }>({
    mutationFn: async ({ groupId, mode }) => {
      const result = await updatePeriodModeAction(groupId, { mode });
      if (!result.success || !result.periodMode) throw new Error(result.message || 'Failed to update period mode');
      return { periodMode: result.periodMode };
    },
    onSuccess: (data, { groupId }) => {
        // Invalidate group details to reflect mode change
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        
        // toast.success(`Period mode updated to ${data.periodMode}`);
    },
    onError: (error: Error) => {
        console.error('Error updating period mode:', error);
        toast.error(error.message || 'Failed to update period mode');
    }
  });

  // Fetch Group Stats (Deduplicated with React Query)
  const useGroupStats = (groupId: string, enabled: boolean = true) => {
    return useQuery({
      queryKey: ['group-stats', groupId],
      queryFn: async () => {
        const result = await getGroupStatsAction(groupId);
        if (!result.success) throw new Error(result.message || 'Failed to fetch group stats');
        return result.stats;
      },
      enabled: !!groupId && enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,
    });
  };

  return {
    data: userGroups,
    isLoading,
    error: error || null,
    useGroupsList,
    useGroupDetails,
    getGroupDetails,
    createGroup,
    updateGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    useJoinRequests,
    handleJoinRequest,
    resetJoinRequestStatus,
    updatePeriodMode,
    useGroupStats,
  };
}

export default useGroups;
