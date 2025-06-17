import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const groupId = searchParams.get('groupId');

    // If neither code nor groupId is provided, return an error
    if (!code && !groupId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // If code is provided, validate the invite token
    if (code) {
      const inviteToken = await prisma.inviteToken.findUnique({
        where: { token: code },
        include: {
          room: true
        }
      });

      if (!inviteToken) {
        return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
      }

      if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Invite token has expired' }, { status: 400 });
      }

      if (inviteToken.usedAt) {
        return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 });
      }

      // Check if user is already a member
      const existingMembership = await prisma.roomMember.findFirst({
        where: {
          roomId: inviteToken.roomId,
          userId: session.user.id
        }
      });

      if (existingMembership) {
        return NextResponse.json({
          isMember: true,
          groupId: inviteToken.roomId,
          group: inviteToken.room
        });
      }

      // Check if group is full
      const memberCount = await prisma.roomMember.count({
        where: { roomId: inviteToken.roomId }
      });

      if (inviteToken.room.maxMembers && memberCount >= inviteToken.room.maxMembers) {
        return NextResponse.json({ error: 'Group is full' }, { status: 400 });
      }

      return NextResponse.json({
        group: inviteToken.room,
        role: inviteToken.role,
        groupId: inviteToken.roomId
      });
    }

    // If groupId is provided, validate the group
    if (groupId) {
      const group = await prisma.room.findUnique({
        where: { id: groupId }
      });

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      // Check if user is already a member
      const existingMembership = await prisma.roomMember.findFirst({
        where: {
          roomId: groupId,
          userId: session.user.id
        }
      });

      if (existingMembership) {
        return NextResponse.json({
          isMember: true,
          groupId,
          group
        });
      }

      // Check if group is full
      const memberCount = await prisma.roomMember.count({
        where: { roomId: groupId }
      });

      if (group.maxMembers && memberCount >= group.maxMembers) {
        return NextResponse.json({ error: 'Group is full' }, { status: 400 });
      }

      return NextResponse.json({
        group,
        groupId
      });
    }
  } catch (error) {
    console.error('Error in GET /api/groups/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const groupId = searchParams.get('groupId');

    // If neither code nor groupId is provided, return an error
    if (!code && !groupId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // If code is provided, handle invite-based join
    if (code) {
      const inviteToken = await prisma.inviteToken.findUnique({
        where: { token: code },
        include: {
          room: true
        }
      });

      if (!inviteToken) {
        return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
      }

      if (inviteToken.expiresAt && inviteToken.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Invite token has expired' }, { status: 400 });
      }

      if (inviteToken.usedAt) {
        return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 });
      }

      // Check if user is already a member
      const existingMembership = await prisma.roomMember.findFirst({
        where: {
          roomId: inviteToken.roomId,
          userId: session.user.id
        }
      });

      if (existingMembership) {
        return NextResponse.json({
          isMember: true,
          groupId: inviteToken.roomId
        });
      }

      // Check if group is full
      const memberCount = await prisma.roomMember.count({
        where: { roomId: inviteToken.roomId }
      });

      if (inviteToken.room.maxMembers && memberCount >= inviteToken.room.maxMembers) {
        return NextResponse.json({ error: 'Group is full' }, { status: 400 });
      }

      // Create membership and update invite token in a transaction
      await prisma.$transaction([
        prisma.roomMember.create({
          data: {
            roomId: inviteToken.roomId,
            userId: session.user.id,
            role: inviteToken.role
          }
        }),
        prisma.inviteToken.update({
          where: { token: code },
          data: {
            usedAt: new Date()
          }
        })
      ]);

      return NextResponse.json({
        message: 'Successfully joined the group',
        groupId: inviteToken.roomId
      });
    }

    // If groupId is provided, handle direct join
    if (groupId) {
      const group = await prisma.room.findUnique({
        where: { id: groupId }
      });

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      // Check if user is already a member
      const existingMembership = await prisma.roomMember.findFirst({
        where: {
          roomId: groupId,
          userId: session.user.id
        }
      });

      if (existingMembership) {
        return NextResponse.json({
          isMember: true,
          groupId
        });
      }

      // Check if group is full
      const memberCount = await prisma.roomMember.count({
        where: { roomId: groupId }
      });

      if (group.maxMembers && memberCount >= group.maxMembers) {
        return NextResponse.json({ error: 'Group is full' }, { status: 400 });
      }

      // Create membership
      await prisma.roomMember.create({
        data: {
          roomId: groupId,
          userId: session.user.id,
          role: Role.MEMBER
        }
      });

      return NextResponse.json({
        message: 'Successfully joined the group',
        groupId
      });
    }
  } catch (error) {
    console.error('Error in POST /api/groups/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 