import { useEffect, useState, useCallback } from "react";
import { useActiveGroup } from "@/contexts/group-context";
import axios from "axios";

// Types for votes and candidates
export interface Candidate {
  id: string;
  name: string;
  image?: string;
  votes: number;
}

export interface ActiveVote {
  id: string;
  title: string;
  type: "manager" | "meal";
  status: "active";
  endTime: string;
  totalVotes: number;
  candidates: Candidate[];
}

export interface PastVote {
  id: string;
  title: string;
  type: "manager" | "meal";
  status: "completed";
  endTime: string;
  totalVotes: number;
  winner: {
    id: string;
    name: string;
    image?: string;
    votes: number;
  };
}

type Vote = ActiveVote | PastVote;

type VotesResponse = { votes: Vote[] };

type CreateVoteResponse = { vote: Vote };
type CastVoteResponse = { vote: Vote };

export function useVoting() {
  const { activeGroup } = useActiveGroup();
  const [activeVotes, setActiveVotes] = useState<ActiveVote[]>([]);
  const [pastVotes, setPastVotes] = useState<PastVote[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch votes for the current group
  useEffect(() => {
    if (!activeGroup) {
      setActiveVotes([]);
      setPastVotes([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await axios.get<VotesResponse>(`/api/groups/${activeGroup.id}/votes`);
        const votes = res.data.votes || [];
        setActiveVotes(votes.filter((v: any) => v.status === "active") as ActiveVote[]);
        setPastVotes(votes.filter((v: any) => v.status === "completed") as PastVote[]);
      } catch {
        setActiveVotes([]);
        setPastVotes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeGroup]);

  // Create a new vote
  const createVote = useCallback(
    async (voteData: Partial<ActiveVote>) => {
      if (!activeGroup) return;
      setLoading(true);
      try {
        const res = await axios.post<CreateVoteResponse>(`/api/groups/${activeGroup.id}/votes`, voteData);
        const newVote = res.data.vote;
        setActiveVotes((prev) => [newVote as ActiveVote, ...prev]);
      } finally {
        setLoading(false);
      }
    },
    [activeGroup]
  );

  // Cast a vote
  const castVote = useCallback(
    async (voteId: string, candidateId: string) => {
      if (!activeGroup) return;
      setLoading(true);
      try {
        const res = await axios.patch<CastVoteResponse>(`/api/groups/${activeGroup.id}/votes`, { voteId, candidateId });
        const updatedVote = res.data.vote;
        setActiveVotes((prev) =>
          prev.map((v) => (v.id === updatedVote.id ? (updatedVote as ActiveVote) : v))
        );
      } finally {
        setLoading(false);
      }
    },
    [activeGroup]
  );

  return {
    activeVotes,
    pastVotes,
    loading,
    createVote,
    castVote,
    group: activeGroup,
  };
}

export default useVoting; 