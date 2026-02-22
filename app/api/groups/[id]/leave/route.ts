import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { Role, NotificationType } from "@prisma/client";
import { leaveGroup } from '@/lib/services/groups-service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

    await leaveGroup(groupId, session.user.id);

    return NextResponse.json(
      { message: 'Successfully left the group' }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error leaving group:', error);
    
    // Surface meaningful errors to the client
    const errorMessage = error.message || 'Internal Server Error';
    if (errorMessage.includes('Not a member') || errorMessage.includes('CREATOR_CANNOT_LEAVE')) {
         return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
} 