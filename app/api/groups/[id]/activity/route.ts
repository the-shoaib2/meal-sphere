import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { fetchGroupActivityLogs } from "@/lib/services/groups-service";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    const activities = await fetchGroupActivityLogs(id, session.user.id);

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    if (error instanceof Error) {
        if (error.message === 'Unauthorized') return new NextResponse("Unauthorized", { status: 401 });
        if (error.message.includes('banned')) return new NextResponse("You are banned from this group", { status: 403 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}