import { useCallback } from "react";
import { useActiveGroup } from "@/contexts/group-context";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { assertOnline } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from "axios";

export interface Candidate {
  id: string;
  name: string;
  image?: string;
}

export interface Voter {
  id: string;
  name: string;
  image?: string;
}

export interface Vote {
  id: string;
  title: string;
  description?: string;
  type: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  options: Candidate[];
  results: Record<string, Voter[]>;
  winner?: Candidate;
  totalVotes?: number;
}

type VotesResponse = { votes: Vote[] };
type CreateVoteResponse = { vote: Vote };
type CastVoteResponse = { vote: Vote };

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

  // Fetch all votes using React Query
  const { data: votesData, isLoading: initialLoading } = useQuery<Vote[]>({
    queryKey: ['votes', groupId],
    queryFn: async () => {
      assertOnline();
      if (!groupId) return [];

      const res = await axios.get<VotesResponse>(`/api/groups/${groupId}/votes`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        params: { _t: new Date().getTime() }
      });
      return res.data.votes || [];
    },
    enabled: !!groupId,
    initialData: options?.initialVotes,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Refetch every minute to check for expired votes
    select: (votes) => votes, // Can add transformation here if needed
  });

  // Separate active and past votes using useMemo equivalent
  const activeVotes = votesData?.filter((v) => v.isActive) || [];
  const pastVotes = votesData?.filter((v) => !v.isActive) || [];

  // Create vote mutation
  const createVoteMutation = useMutation({
    mutationFn: async (voteData: Partial<Vote> & { candidates: Candidate[]; startDate?: string; endDate?: string }) => {
      assertOnline();
      if (!groupId) throw new Error('No active group');

      const res = await axios.post<CreateVoteResponse>(`/api/groups/${groupId}/votes`, voteData);
      return res.data.vote;
    },
    onSuccess: (newVote) => {
      // Optimistically update the cache
      queryClient.setQueryData<Vote[]>(['votes', groupId], (old = []) => [newVote, ...old]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create vote",
        description: error?.response?.data?.error || 'Failed to create vote.',
        variant: "destructive",
      });
    },
  });

  // Cast vote mutation
  const castVoteMutation = useMutation({
    mutationFn: async ({ voteId, candidateId }: { voteId: string; candidateId: string }) => {
      assertOnline();
      if (!groupId || !userId) throw new Error('Missing required data');

      const res = await axios.patch<CastVoteResponse>(
        `/api/groups/${groupId}/votes`,
        { voteId, candidateId, userId }
      );
      return res.data.vote;
    },
    onSuccess: (updatedVote) => {
      // Update the cache with the new vote data
      queryClient.setQueryData<Vote[]>(['votes', groupId], (old = []) =>
        old.map((v) => (v.id === updatedVote.id ? updatedVote : v))
      );

      // Show appropriate toast based on vote status
      if (!updatedVote.isActive) {
        if (updatedVote.winner) {
          toast({
            title: "Vote Completed!",
            description: `"${updatedVote.title}" has been completed. Winner: ${updatedVote.winner.name}`,
            duration: 5000,
          });
        } else {
          toast({
            title: "Vote Expired",
            description: "This vote has expired and has been moved to history.",
            duration: 5000,
          });
        }
      }
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

  return {
    activeVotes,
    pastVotes,
    loading: createVoteMutation.isPending || castVoteMutation.isPending,
    initialLoading,
    isSubmitting: castVoteMutation.isPending,
    createVote,
    castVote,
    hasVoted,
    group: contextGroup || (options?.groupId ? { id: options.groupId } : null),
    refreshVotes,
  };
}

export default useVoting;