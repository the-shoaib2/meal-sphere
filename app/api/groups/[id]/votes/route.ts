import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo (replace with DB in production)
const votesStore: Record<string, any[]> = {};
const groupManagerStore: Record<string, { managerId: string; until: Date } | null> = {};

// Simulate notification
function sendNotification(groupId: string, message: string) {
  // Replace with real notification logic
  console.log(`[Notification][Group ${groupId}]: ${message}`);
}

function getGroupIdFromUrl(req: NextRequest) {
  // /api/groups/[id]/votes
  const match = req.nextUrl.pathname.match(/groups\/(.*?)\//);
  return match ? match[1] : undefined;
}

// GET: List all votes for a group
export async function GET(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });
  const votes = votesStore[groupId] || [];
  return NextResponse.json({ votes });
}

// POST: Create a new vote for a group
export async function POST(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });
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

  // If vote type is 'manager' or 'meal', log creation
  if (data.type === "manager" || data.type === "meal") {
    sendNotification(groupId, `A new ${data.type} vote has started.`);
  }

  return NextResponse.json({ vote: newVote }, { status: 201 });
}

// PATCH: Cast a vote (voteId, candidateId in body)
export async function PATCH(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });
  const { voteId, candidateId } = await req.json();
  const votes = votesStore[groupId] || [];
  const vote = votes.find((v: any) => v.id === voteId);
  if (!vote) return NextResponse.json({ error: "Vote not found" }, { status: 404 });
  const candidate = vote.candidates.find((c: any) => c.id === candidateId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  candidate.votes += 1;
  vote.totalVotes += 1;

  // Check for winner (majority)
  const majority = Math.floor(vote.totalVotes / 2) + 1;
  const winningCandidate = vote.candidates.find((c: any) => c.votes >= majority);
  if (winningCandidate && vote.status === "active") {
    vote.status = "completed";
    vote.winner = { ...winningCandidate };
    // Set meal manager for a month if type is manager or meal
    if (vote.type === "manager" || vote.type === "meal") {
      const until = new Date();
      until.setMonth(until.getMonth() + 1);
      groupManagerStore[groupId] = { managerId: winningCandidate.id, until };
      sendNotification(
        groupId,
        `New ${vote.type === "manager" ? "manager" : "meal manager"} is ${winningCandidate.name} until ${until.toLocaleDateString()}`
      );
    }
    sendNotification(groupId, `Vote completed. Winner: ${winningCandidate.name}`);
  }

  return NextResponse.json({ vote });
} 