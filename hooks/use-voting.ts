import { useCallback } from "react";
import { useActiveGroup } from "@/contexts/group-context";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { assertOnline } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createVoteAction, 
  castVoteAction, 
  deleteVoteAction, 
  updateVoteAction 
} from "@/lib/actions/vote.actions";

import { Vote, Candidate, Voter } from "@/components/groups/voting/types";

export function useVoting(options?: {
  groupId?: string;
  initialVotes?: Vote[];
  userId?: string;
}) {
  const { activeGroup: contextGroup } = useActiveGroup();
  const { data: session } = useSession();
  const userId = options?.userId || session?.user?.id;
  const groupId = options?.groupId || contextGroup?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all votes remains somewhat standard for GET if not using server components exclusively
  // But for better performance, we already pass initialVotes from server
  const { data: votesData, isLoading: initialLoading } = useQuery<Vote[]>({
    queryKey: ['votes', groupId],
    queryFn: async () => {
      assertOnline();
      if (!groupId) return [];

      // Still using API for GET list if not refreshed via Server Actions revalidation
      // But we can also use a Server Action for GET if we want.
      // For now, let's keep GET as is or use the cached server-side votes.
      const res = await fetch(`/api/groups/${groupId}/votes?_t=${Date.now()}`);
      const data = await res.json();
      return data.votes || [];
    },
    enabled: !!groupId,
    initialData: options?.initialVotes,
    staleTime: 5 * 60 * 1000, 
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  const activeVotes = votesData?.filter((v) => v?.isActive) || [];
  const pastVotes = votesData?.filter((v) => v && !v.isActive) || [];

  // Create vote mutation
  const createVoteMutation = useMutation({
    mutationFn: async (voteData: any) => {
      assertOnline();
      if (!groupId) throw new Error('No active group');
      const result: any = await createVoteAction(groupId, voteData);
      if (!result.success) throw new Error(result.message || 'Failed to create vote');
      return result.data;
    },
    onSuccess: (newVote) => {
      queryClient.setQueryData<Vote[]>(['votes', groupId], (old = []) => [newVote, ...old]);
      toast({ title: "Vote created", description: "The vote was successfully started." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cast vote mutation
  const castVoteMutation = useMutation({
    mutationFn: async ({ voteId, candidateId }: { voteId: string; candidateId: string }) => {
      assertOnline();
      if (!groupId || !userId) throw new Error('Missing required data');
      const result: any = await castVoteAction(groupId, voteId, candidateId);
      if (!result.success) throw new Error(result.message || 'Failed to cast vote');
      return result.data;
    },
    onSuccess: (result: any) => {
      const updatedVote = result.data || result;
      queryClient.setQueryData<Vote[]>(['votes', groupId], (old = []) =>
        old.map((v) => (v.id === updatedVote.id ? updatedVote : v))
      );
      toast({ title: "Vote cast successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Vote Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit vote mutation
  const updateVoteMutation = useMutation({
    mutationFn: async ({ voteId, ...updateData }: any) => {
      assertOnline();
      if (!groupId) throw new Error('No active group');
      const result: any = await updateVoteAction(groupId, voteId, updateData);
      if (!result.success) throw new Error(result.message || 'Failed to update vote');
      return result.vote;
    },
    onSuccess: (updatedVote) => {
      queryClient.invalidateQueries({ queryKey: ['votes', groupId] });
      toast({ title: "Vote updated", description: "Changes saved successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete vote mutation
  const deleteVoteMutation = useMutation({
    mutationFn: async (voteId: string) => {
      assertOnline();
      if (!groupId) throw new Error('No active group');
      const result: any = await deleteVoteAction(groupId, voteId);
      if (!result.success) throw new Error(result.message || 'Failed to delete vote');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votes', groupId] });
      toast({ title: "Vote deleted", description: "The vote was successfully removed." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createVote = useCallback(
    async (voteData: Partial<Vote> & { candidates: Candidate[]; startDate?: string; endDate?: string }) => {
      try {
        await createVoteMutation.mutateAsync(voteData);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.error || 'Failed to create vote.' };
      }
    },
    [createVoteMutation]
  );

  const castVote = useCallback(
    async (voteId: string, candidateId: string) => {
      await castVoteMutation.mutateAsync({ voteId, candidateId });
    },
    [castVoteMutation]
  );

  const hasVoted = useCallback(
    (vote: Vote) => {
      if (!userId) return false;
      return Object.values(vote.results || {}).some((arr) =>
        Array.isArray(arr) && arr.some(voter => voter.id === userId)
      );
    },
    [userId]
  );

  const refreshVotes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['votes', groupId] });
  }, [queryClient, groupId]);

  const deleteVote = useCallback(
    async (voteId: string) => {
      try {
        await deleteVoteMutation.mutateAsync(voteId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.error || 'Failed to delete vote.' };
      }
    },
    [deleteVoteMutation]
  );

  const updateVote = useCallback(
    async (voteData: any) => {
      await updateVoteMutation.mutateAsync(voteData);
    },
    [updateVoteMutation]
  );

  return {
    activeVotes,
    pastVotes,
    loading: createVoteMutation.isPending || castVoteMutation.isPending || deleteVoteMutation.isPending || updateVoteMutation.isPending,
    initialLoading,
    isSubmitting: castVoteMutation.isPending,
    createVote,
    castVote,
    deleteVote,
    updateVote,
    hasVoted,
    group: contextGroup || (options?.groupId ? { id: options.groupId } : null),
    refreshVotes,
  };
}

export default useVoting;