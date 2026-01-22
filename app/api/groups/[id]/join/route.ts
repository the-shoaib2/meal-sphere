import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { joinGroup } from "@/lib/services/groups-service";
import { z } from "zod";

const joinGroupSchema = z.object({
  password: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { password, token } = joinGroupSchema.parse(body);

    const result = await joinGroup(groupId, session.user.id, password, token);

    return NextResponse.json({
      message: 'Successfully joined the group',
      membership: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: error.format() }, { status: 400 });
    }
    console.error('Error joining group:', error);
    // Handle specific errors thrown by service
    const errorMessage = error instanceof Error ? error.message : 'Failed to join group';
    const status = errorMessage.includes('not found') ? 404 : 
                   errorMessage.includes('Unauthorized') || errorMessage.includes('Private group') ? 403 : 
                   errorMessage.includes('Already a member') || errorMessage.includes('full') ? 400 : 500;
                   
    return NextResponse.json(
      { error: errorMessage },
      { status: status }
    );
  }
}
