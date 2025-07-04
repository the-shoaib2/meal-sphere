import { useEffect, useState, useCallback } from "react";
import { useActiveGroup } from "@/contexts/group-context";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

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

export function useVoting() {
  const { activeGroup } = useActiveGroup();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [activeVotes, setActiveVotes] = useState<Vote[]>([]);
  const [pastVotes, setPastVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Function to fetch votes
  const fetchVotes = useCallback(async (isInitial = false) => {
    if (!activeGroup) {
      setActiveVotes([]);
      setPastVotes([]);
      if (isInitial) setInitialLoading(false);
      return;
    }
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await axios.get<VotesResponse>(`/api/groups/${activeGroup.id}/votes`);
      const votes = res.data.votes || [];
      setActiveVotes(votes.filter((v) => v.isActive));
      setPastVotes(votes.filter((v) => !v.isActive));
    } catch {
      setActiveVotes([]);
      setPastVotes([]);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [activeGroup]);

  useEffect(() => {
    fetchVotes(true);
  }, [fetchVotes]);

  // Set up periodic refresh to check for expired votes
  useEffect(() => {
    if (!activeGroup || activeVotes.length === 0) return;

    // Check for expired votes every minute
    const interval = setInterval(() => {
      const now = new Date();
      const hasExpiredVotes = activeVotes.some(vote => 
        vote.endDate && new Date(vote.endDate) <= now
      );
      
      if (hasExpiredVotes) {
        // Refresh votes to get updated status from server
        fetchVotes();
        toast({
          title: "Votes Expired",
          description: "Some votes have expired and have been moved to history.",
          duration: 5000,
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [activeGroup, activeVotes, fetchVotes, toast]);

  const createVote = useCallback(
    async (voteData: Partial<Vote> & { candidates: Candidate[]; startDate?: string; endDate?: string }) => {
      if (!activeGroup) return;
      setLoading(true);
      try {
        const res = await axios.post<CreateVoteResponse>(`/api/groups/${activeGroup.id}/votes`, voteData);
        const newVote = res.data.vote;
        setActiveVotes((prev) => [newVote, ...prev]);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.error || 'Failed to create vote.' };
      } finally {
        setLoading(false);
      }
    },
    [activeGroup]
  );

  const castVote = useCallback(
    async (voteId: string, candidateId: string) => {
      if (!activeGroup || !userId) return;
      setIsSubmitting(true);
      try {
        const res = await axios.patch<CastVoteResponse>(`/api/groups/${activeGroup.id}/votes`, { voteId, candidateId, userId });
        const updatedVote = res.data.vote;
        
        // If vote is no longer active, move it from activeVotes to pastVotes
        if (!updatedVote.isActive) {
          setActiveVotes((prev) => prev.filter((v) => v.id !== updatedVote.id));
          setPastVotes((prev) => [updatedVote, ...prev]);
          
          // Show different toast based on whether vote was completed or expired
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
        } else {
          // If vote is still active, update it in activeVotes
          setActiveVotes((prev) =>
            prev.map((v) => (v.id === updatedVote.id ? updatedVote : v))
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeGroup, userId, toast]
  );

  const hasVoted = useCallback(
    (vote: Vote) => {
      if (!userId) return false;
      return Object.values(vote.results || {}).some((arr) => Array.isArray(arr) && arr.some(voter => voter.id === userId));
    },
    [userId]
  );

  return {
    activeVotes,
    pastVotes,
    loading,
    initialLoading,
    isSubmitting,
    createVote,
    castVote,
    hasVoted,
    group: activeGroup,
    refreshVotes: fetchVotes,
  };
}

export default useVoting; 