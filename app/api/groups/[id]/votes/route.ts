export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { checkGroupAccess } from "@/lib/auth/group-auth";
import { 
  createVote, 
  getVotes, 
  castVote, 
  deleteVote, 
  getVote
} from "@/lib/services/voting-service";
import { revalidatePath, revalidateTag as _revalidateTag } from "next/cache";
import { prisma } from "@/lib/services/prisma";
import { Role, VoteType } from "@prisma/client";

const revalidateTag = _revalidateTag as any;

function getGroupIdFromUrl(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/groups\/(.*?)\//);
  return match ? match[1] : undefined;
}

// GET: List all votes for a group
export async function GET(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  try {
    const votes = await getVotes(groupId);
    return NextResponse.json({ votes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch votes" }, { status: 500 });
  }
}

// POST: Create a new vote for a group
export async function POST(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  const access = await checkGroupAccess(groupId);
  if (!access.isAuthenticated) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!access.isMember) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await createVote(groupId, access.userId!, {
      title: body.title,
      description: body.description,
      type: body.type as VoteType,
      startDate: body.startDate,
      endDate: body.endDate,
      options: body.candidates || body.options || []
    });

    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`votes-${groupId}`);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create vote" }, { status: 500 });
  }
}

// PATCH: Cast a vote
export async function PATCH(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  try {
    const { voteId, candidateId, userId } = await req.json();
    
    // Check access
    const access = await checkGroupAccess(groupId);
    if (!access.isAuthenticated || access.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await castVote(voteId, userId, candidateId);

    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`votes-${groupId}`);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to cast vote" }, { status: 500 });
  }
}

// DELETE: Delete a vote
export async function DELETE(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  try {
    const { voteId } = await req.json();
    const access = await checkGroupAccess(groupId);
    
    if (!access.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization check is inside deleteVote (it checks if user is creator or admin)
    const result = await deleteVote(voteId, access.userId!, access.isAdmin);

    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`votes-${groupId}`);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete vote" }, { status: 500 });
  }
}

// PUT: Edit a vote (Keeping manual logic for now if service doesn't support it yet, 
// or adding updateVote to service if needed. Let's stick to service-based approach if possible.)
export async function PUT(req: NextRequest) {
  const groupId = getGroupIdFromUrl(req);
  if (!groupId) return NextResponse.json({ error: "Group ID not found" }, { status: 400 });

  try {
    const body = await req.json();
    const { voteId, ...updateData } = body;
    const access = await checkGroupAccess(groupId);

    if (!access.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service doesn't have updateVote, using prisma directly for now but ensuring revalidation
    const existingVote = await prisma.vote.findUnique({ where: { id: voteId } });
    if (!existingVote || existingVote.userId !== access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.vote.update({
      where: { id: voteId },
      data: {
        title: updateData.title,
        description: updateData.description,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        options: updateData.candidates ? JSON.stringify(updateData.candidates) : undefined
      }
    });

    revalidatePath(`/groups/${groupId}`);
    revalidateTag(`votes-${groupId}`);

    return NextResponse.json({ success: true, vote: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update vote" }, { status: 500 });
  }
}