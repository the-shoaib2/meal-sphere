import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from "next-auth/react";
import { toast } from 'react-hot-toast';
import { 
  createVoteAction, 
  castVoteAction, 
  deleteVoteAction, 
  updateVoteAction 
} from "@/lib/actions/vote.actions";
import { QUERY_KEYS } from "@/lib/constants/query-keys";
import { Vote, Candidate } from "@/components/groups/voting/types";

/**
 * Hook for managing group voting data and actions.
 */
export function useGroupVoting(groupId?: string, initialVotes?: Vote[]) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // Query Votes
  const { data: votes = [], isLoading } = useQuery<Vote[]>({
    queryKey: [QUERY_KEYS.VOTES, groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await fetch(`/api/groups/${groupId}/votes?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch votes');
      const data = await res.json();
      return (data.votes || []) as Vote[];
    },
    enabled: !!groupId,
    initialData: initialVotes,
    staleTime: 5 * 60 * 1000, 
    refetchOnWindowFocus: false,
  });

  const activeVotes = votes.filter((v) => v?.isActive);
  const pastVotes = votes.filter((v) => v && !v.isActive);

  // Mutations
  const createVote = useMutation({
    mutationFn: async (voteData: any) => {
      if (!groupId) throw new Error('No active group');
      const result = await createVoteAction(groupId, voteData);
      if (!result.success || !result.data) throw new Error(result.message || 'Failed to create vote');
      return result.data as unknown as Vote;
    },
    onSuccess: (newVote) => {
      queryClient.setQueryData<Vote[]>([QUERY_KEYS.VOTES, groupId], (old = []) => [newVote, ...old]);
      toast.success("Vote started successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const castVote = useMutation({
    mutationFn: async ({ voteId, candidateId }: { voteId: string; candidateId: string }) => {
      if (!groupId || !userId) throw new Error('Missing required data');
      const result = await castVoteAction(groupId, voteId, candidateId);
      if (!result.success || !result.data) throw new Error(result.message || 'Failed to cast vote');
      return result.data as unknown as Vote;
    },
    onSuccess: (updatedVote) => {
      queryClient.setQueryData<Vote[]>([QUERY_KEYS.VOTES, groupId], (old = []) =>
        old.map((v) => (v.id === updatedVote.id ? updatedVote : v))
      );
      toast.success("Vote cast successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateVote = useMutation({
    mutationFn: async ({ voteId, ...updateData }: any) => {
      if (!groupId) throw new Error('No active group');
      const result = await updateVoteAction(groupId, voteId, updateData);
      if (!result.success || !result.vote) throw new Error(result.message || 'Failed to update vote');
      return result.vote as unknown as Vote;
    },
    onSuccess: (updatedVote) => {
      queryClient.setQueryData<Vote[]>([QUERY_KEYS.VOTES, groupId], (old = []) =>
        old.map((v) => (v.id === updatedVote.id ? updatedVote : v))
      );
      toast.success("Vote updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteVote = useMutation({
    mutationFn: async (voteId: string) => {
      if (!groupId) throw new Error('No active group');
      const result = await deleteVoteAction(groupId, voteId);
      if (!result.success) throw new Error(result.message || 'Failed to delete vote');
      return voteId;
    },
    onSuccess: (deletedVoteId) => {
      queryClient.setQueryData<Vote[]>([QUERY_KEYS.VOTES, groupId], (old = []) =>
        old.filter((v) => v.id !== deletedVoteId)
      );
      toast.success("Vote removed successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const hasVoted = useCallback((vote: Vote) => {
    if (!userId) return false;
    return Object.values(vote.results || {}).some((arr) =>
      Array.isArray(arr) && arr.some(voter => (voter as any).id === userId)
    );
  }, [userId]);

  return {
    votes,
    activeVotes,
    pastVotes,
    isLoading,
    createVote,
    castVote,
    updateVote,
    deleteVote,
    hasVoted,
  };
}
