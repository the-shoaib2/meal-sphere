import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';

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
import { Room, User } from '@prisma/client';

export interface Group extends Omit<Room, 'createdBy'> {
  createdByUser: Pick<User, 'id' | 'name' | 'email' | 'image'>;
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
  role?: string;
  joinedAt?: string;
}

interface CreateGroupInput {
  name: string;
  description?: string;
  isPrivate?: boolean;
  password?: string;
  maxMembers?: number;
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  password?: string;
  maxMembers?: number | null;
  tags?: string[];
  features?: Record<string, boolean>;
}

interface JoinRequest {
  id: string;
  userId: string;
  roomId: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface UseGroupsReturn {
  data: Group[];
  isLoading: boolean;
  error: Error | null;
  useGroupsList: (options: { filter: 'my' | 'public' }) => {
    data: Group[];
    isLoading: boolean;
    error: Error | null;
  };
  useGroupDetails: (groupId: string, password?: string) => UseQueryResult<Group, Error>;
  getGroupDetails: (groupId: string, password?: string) => Promise<Group>;
  createGroup: ReturnType<typeof useMutation<Group, AxiosError<{ message: string }>, CreateGroupInput>>;
  updateGroup: ReturnType<typeof useMutation<Group, AxiosError<{ message: string }>, { groupId: string; data: UpdateGroupInput }>>;
  joinGroup: ReturnType<typeof useMutation<void, AxiosError<{ message: string }>, JoinGroupInput>>;
  leaveGroup: ReturnType<typeof useMutation<void, AxiosError<{ message: string }>, string>>;
  deleteGroup: ReturnType<typeof useMutation<void, AxiosError<{ message: string }>, string>>;
  useJoinRequests: (groupId: string) => {
    data: JoinRequest[];
    isLoading: boolean;
    error: Error | null;
  };
  handleJoinRequest: ReturnType<typeof useMutation<void, AxiosError<{ message: string }>, { groupId: string; requestId: string; action: 'approve' | 'reject' }>>;
  resetJoinRequestStatus: (groupId: string) => void;
}

export function useGroups(): UseGroupsReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Get user's groups - always define the query, but use enabled to control execution
  const { data: userGroups = [], isLoading: isLoadingGroups, error } = useQuery<Group[], Error>({
    queryKey: ['user-groups'],
    queryFn: async () => {
      // This check is still needed for TypeScript, but the query won't run if enabled is false
      if (!session?.user?.id) return [];
      try {
        const { data } = await axios.get<Group[]>('/api/groups');
        return data;
      } catch (error: unknown) {
        console.error('Error fetching user groups:', error);
        throw new Error('Failed to fetch groups');
      }
    },
    enabled: !!session?.user?.id, // This controls whether the query runs
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Get groups list based on filter
  const useGroupsList = ({ filter }: { filter: 'my' | 'public' }) => {
    const { data: groups = [], isLoading, error: listError } = useQuery<Group[], Error>({
      queryKey: ['groups', filter],
      queryFn: async () => {
        if (!session?.user?.id) return [];
        try {
          const { data } = await axios.get<Group[]>(
            `/api/groups?filter=${filter}`
          );
          return data;
        } catch (error) {
          console.error(`Error fetching ${filter} groups:`, error);
          throw new Error(`Failed to fetch ${filter} groups`);
        }
      },
      enabled: !!session?.user?.id && !!filter,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    });

    return {
      data: groups,
      isLoading,
      error: listError || null,
    };
  };

  // Get group details
  const getGroupDetails = useCallback(async (groupId: string, password?: string): Promise<Group> => {
    try {
      const params = new URLSearchParams();
      if (password) {
        params.append('password', password);
      }
      
      const url = `/api/groups/${groupId}${params.toString() ? `?${params.toString()}` : ''}`;
      
      // Make the API request
      const response = await axios.get<Group>(url, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => {
          // Don't throw for 403 (password required) or 401 (wrong password)
          return (status >= 200 && status < 300) || status === 401 || status === 403;
        },
      });
      
      const responseData = response.data as any;
      
      // Handle the case where the API returns requiresPassword in the success response
      if (response.status === 403 || responseData.requiresPassword) {
        const error = new Error('This is a private group. A password is required.');
        (error as any).requiresPassword = true;
        (error as any).group = responseData.group || {};
        (error as any).status = 403;
        (error as any).code = 'PRIVATE_GROUP';
        throw error;
      }
      
      // Handle invalid password case
      if (response.status === 401) {
        const error = new Error('Invalid password');
        (error as any).code = 'INVALID_PASSWORD';
        throw error;
      }
      
      return responseData;
    } catch (error: any) {
      // If it's already our custom error, just rethrow it
      if (error?.code === 'PRIVATE_GROUP' || error?.code === 'INVALID_PASSWORD') {
        throw error;
      }
      
      // Handle axios errors
      if (error?.response) {
        const responseData = error.response.data || {};
        
        // Handle password required case (403)
        if (error.response.status === 403) {
          const newError = new Error('This is a private group. A password is required.');
          (newError as any).requiresPassword = true;
          (newError as any).group = responseData.group || {};
          (newError as any).code = 'PRIVATE_GROUP';
          throw newError;
        }
        
        // Handle invalid password case (401)
        if (error.response.status === 401) {
          const newError = new Error('Invalid password');
          (newError as any).code = 'INVALID_PASSWORD';
          throw newError;
        }
      }
      
      // For any other errors, rethrow with a generic message
      throw new Error(error?.message || 'Failed to fetch group details');
    }
  }, []);

  const useGroupDetails = (groupId: string, password?: string) => {
    return useQuery<Group, Error>({
      queryKey: ['group', groupId],
      queryFn: () => {
        if (!groupId) throw new Error('Group ID is required');
        return getGroupDetails(groupId, password);
      },
      enabled: !!groupId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry if it's a password required error
        if (error?.requiresPassword) return false;
        return failureCount < 3; // Retry up to 3 times for other errors
      }
    });
  };

  // Create a new group
  const createGroup = useMutation<Group, AxiosError<{ message: string }>, CreateGroupInput>({
    mutationFn: async (groupData: CreateGroupInput) => {
      const { data } = await axios.post<Group>('/api/groups', groupData);
      return data;
    },
    onSuccess: (data: Group) => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Group created successfully');
      router.push(`/groups/${data.id}`);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    },
  });

  // Join a group
  const joinGroup = useMutation<void, AxiosError<{ message: string }>, JoinGroupInput>({
    mutationFn: async ({ groupId, inviteToken, password }) => {
      if (!groupId && !inviteToken) {
        throw new Error('Either groupId or inviteToken must be provided');
      }

      const endpoint = inviteToken 
        ? `/api/groups/join/${inviteToken}`
        : `/api/groups/${groupId}/join`;
      
      await axios.post(endpoint, { 
        join: true,
        password 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Successfully joined the group!');
    },
    onError: (error) => {
      console.error('Error joining group:', error);
      const errorMessage = error.response?.data?.message || 'Failed to join group';
      toast.error(errorMessage);
      throw error;
    },
  });

  // Update a group
  const updateGroup = useMutation<Group, AxiosError<{ message: string }>, { groupId: string; data: UpdateGroupInput }>({
    mutationFn: async ({ groupId, data }) => {
      const { data: updatedGroup } = await axios.patch<Group>(`/api/groups/${groupId}`, data);
      return updatedGroup;
    },
    onSuccess: (data: Group) => {
      queryClient.invalidateQueries({ queryKey: ['group', data.id] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Group updated successfully');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Error updating group:', error);
      toast.error(error.response?.data?.message || 'Failed to update group');
    },
  });

  // Define the context type for the leave group mutation
  type LeaveGroupContext = {
    previousGroup: Group | undefined;
    previousGroups: Group[] | undefined;
  };

  // Leave a group
  const leaveGroup = useMutation<void, AxiosError<{ message: string }>, string, LeaveGroupContext>({
    mutationFn: async (groupId: string) => {
      // Use the proper API endpoint for leaving a group
      await axios.post(`/api/groups/${groupId}/leave`);
    },
    onMutate: async (groupId: string): Promise<LeaveGroupContext> => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['user-groups'] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'my'] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'public'] });
      await queryClient.cancelQueries({ queryKey: ['join-requests', groupId] });
      await queryClient.cancelQueries({ queryKey: ['join-request-status', groupId] });
      
      // Snapshot the previous value
      const previousGroup = queryClient.getQueryData<Group>(['group', groupId]);
      const previousGroups = queryClient.getQueryData<Group[]>(['user-groups']);
      
      // Optimistically update the UI
      if (previousGroup) {
        queryClient.setQueryData(['group', groupId], {
          ...previousGroup,
          members: (previousGroup as Group).members?.filter(m => m.userId !== session?.user?.id) || []
        });
      }
      
      if (Array.isArray(previousGroups)) {
        queryClient.setQueryData(['user-groups'], 
          (previousGroups as Group[]).filter(g => g.id !== groupId)
        );
      }
      
      return { previousGroup, previousGroups };
    },
    onSuccess: (_, groupId) => {
      // Comprehensive cache invalidation and clearing
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
      
      // Remove specific group data from cache
      queryClient.removeQueries({ queryKey: ['group', groupId] });
      queryClient.removeQueries({ queryKey: ['join-requests', groupId] });
      queryClient.removeQueries({ queryKey: ['join-request-status', groupId] });
      queryClient.removeQueries({ queryKey: ['group-members', groupId] });
      queryClient.removeQueries({ queryKey: ['group-activities', groupId] });
      
      // Clear any join request status for this group
      queryClient.setQueryData(['join-request-status', groupId], null);
      
      toast.success('You have left the group successfully');
      router.push('/groups');
    },
    onError: (error: AxiosError<{ message: string }>, groupId: string, context: LeaveGroupContext | undefined) => {
      console.error('Error leaving group:', error);
      
      // Handle specific error cases
      const errorMessage = error.response?.data?.message || 'Failed to leave group';
      
      if (errorMessage.includes('CREATOR_CANNOT_LEAVE')) {
        toast.error('Group creator cannot leave. Please transfer ownership or delete the group.');
      } else {
        toast.error(errorMessage);
      }
      
      // Rollback on error
      if (context?.previousGroup) {
        queryClient.setQueryData(['group', groupId], context.previousGroup);
      }
      if (context?.previousGroups) {
        queryClient.setQueryData(['user-groups'], context.previousGroups);
      }
    },
    onSettled: (data, error, groupId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['join-request-status', groupId] });
    },
  });
  // Delete group
  const deleteGroup = useMutation<void, AxiosError<{ message: string }>, string, { previousGroups: Group[] | undefined }>({
    mutationFn: async (groupId: string) => {
      await axios.delete(`/api/groups/${groupId}`);
    },
    onMutate: async (groupId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-groups'] });
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });

      // Snapshot the previous value
      const previousGroups = queryClient.getQueryData<Group[]>(['user-groups']);

      // Optimistically update the groups list
      if (Array.isArray(previousGroups)) {
        queryClient.setQueryData(['user-groups'], 
          previousGroups.filter(g => g.id !== groupId)
        );
      }

      // Remove the group from cache
      queryClient.removeQueries({ queryKey: ['group', groupId] });

      return { previousGroups };
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Group deleted successfully');
      router.push('/groups');
    },
    onError: (error: AxiosError<{ message: string }>, groupId: string, context) => {
      console.error('Error deleting group:', error);
      
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(['user-groups'], context.previousGroups);
      }
      
      toast.error(error.response?.data?.message || 'Failed to delete group');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
  });

  // Fetch join requests
  const useJoinRequests = (groupId: string) => {
    const { data: joinRequests = [], isLoading: isLoadingJoinRequests, error: joinRequestsError } = useQuery<JoinRequest[], Error>({
      queryKey: ['join-requests', groupId],
      queryFn: async () => {
        if (!session?.user?.id) return [];
        try {
          const { data } = await axios.get<JoinRequest[]>(`/api/groups/${groupId}/join-request`);
          return data;
        } catch (error) {
          console.error(`Error fetching join requests for group ${groupId}:`, error);
          throw new Error('Failed to fetch join requests');
        }
      },
      enabled: !!session?.user?.id && !!groupId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    });

    return {
      data: joinRequests,
      isLoading: isLoadingJoinRequests,
      error: joinRequestsError || null,
    };
  };

  // Handle join request
  const handleJoinRequest = useMutation<void, AxiosError<{ message: string }>, { groupId: string; requestId: string; action: 'approve' | 'reject' }>({
    mutationFn: async ({ groupId, requestId, action }) => {
      await axios.patch(`/api/groups/${groupId}/join-request/${requestId}`, { action });
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      toast.success('Join request handled successfully');
    },
    onError: (error) => {
      console.error('Error handling join request:', error);
      toast.error(error.response?.data?.message || 'Failed to handle join request');
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
  }, [queryClient]);

  return {
    data: userGroups,
    isLoading: isLoadingGroups,
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
  };
}

export default useGroups;
