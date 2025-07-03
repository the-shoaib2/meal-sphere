import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo (replace with DB in production)
const votesStore: Record<string, any[]> = {};

// GET: List all votes for a group
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = params.id;
  const votes = votesStore[groupId] || [];
  return NextResponse.json({ votes });
}

// POST: Create a new vote for a group
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = params.id;
  const data = await req.json();
  const newVote = {
    ...data,
    id: `vote-${Date.now()}`,
    status: "active",
    totalVotes: 0,
    candidates: data.candidates?.map((c: any) => ({ ...c, votes: 0 })) || [],
  };
  if (!votesStore[groupId]) votesStore[groupId] = [];
  votesStore[groupId].unshift(newVote);
  return NextResponse.json({ vote: newVote }, { status: 201 });
}

// PATCH: Cast a vote (voteId, candidateId in body)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = params.id;
  const { voteId, candidateId } = await req.json();
  const votes = votesStore[groupId] || [];
  const vote = votes.find((v: any) => v.id === voteId);
  if (!vote) return NextResponse.json({ error: "Vote not found" }, { status: 404 });
  const candidate = vote.candidates.find((c: any) => c.id === candidateId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  candidate.votes += 1;
  vote.totalVotes += 1;
  return NextResponse.json({ vote });
} 