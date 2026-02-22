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
  description?: string;
  userId?: string;
}

export interface ActiveVote {
  id: string;
  title: string;
  type: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  userId?: string;
  roomId?: string;
  candidateId?: string | null;
  options: Candidate[];
  results: Record<string, Voter[]>;
  isAnonymous?: boolean;
  createdAt?: string;
  updatedAt?: string;
  totalVotes?: number;
  winner?: Candidate;
  description?: string;
}

export interface PastVote extends ActiveVote {} 