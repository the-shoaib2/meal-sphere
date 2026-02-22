"use server";

import { prisma } from '@/lib/services/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createNotification } from "@/lib/utils/notification-utils";
import { NotificationType } from "@prisma/client";
import { z } from "zod";

const marketDateUpdateSchema = z.object({
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

const marketDateSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
});

export async function createMarketDateAction(data: { roomId: string; userId: string; date: string | Date }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" };
    }

    const validatedData = marketDateSchema.parse(data);

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: { where: { roomId: validatedData.roomId, role: "MANAGER" } },
      },
    });

    if (!currentUser || currentUser.rooms.length === 0) {
      return { success: false, message: "You are not a manager of this room" };
    }

    const assignedUser = await prisma.roomMember.findFirst({
      where: { userId: validatedData.userId, roomId: validatedData.roomId },
      include: { user: true },
    });

    if (!assignedUser) {
      return { success: false, message: "Assigned user is not a member of this room" };
    }

    const marketDate = await prisma.marketDate.create({
      data: {
        date: validatedData.date,
        userId: validatedData.userId,
        roomId: validatedData.roomId,
      },
    });

    const room = await prisma.room.findUnique({ where: { id: validatedData.roomId } });

    await createNotification({
      userId: validatedData.userId,
      type: NotificationType.GENERAL,
      message: `You have been assigned market duty for ${room?.name} on ${validatedData.date.toLocaleDateString()}.`,
    });

    return { success: true, marketDate };
  } catch (error: any) {
    console.error("Error assigning market date:", error);
    return { success: false, message: "Failed to assign market date" };
  }
}

export async function getMarketDatesAction(roomId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized", marketDates: [] };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { rooms: { where: { roomId } } },
    });

    if (!user || user.rooms.length === 0) {
      return { success: false, message: "You are not a member of this room", marketDates: [] };
    }

    const marketDates = await prisma.marketDate.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { date: "desc" },
    });

    return { success: true, marketDates };
  } catch (error: any) {
    console.error("Error fetching market dates:", error);
    return { success: false, message: "Failed to fetch market dates", marketDates: [] };
  }
}

export async function updateMarketDateAction(id: string, status: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" };
    }

    const validatedData = marketDateUpdateSchema.parse({ status });

    const marketDate = await prisma.marketDate.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!marketDate) {
      return { success: false, message: "Market date not found" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { rooms: { where: { roomId: marketDate.roomId } } },
    });

    if (!user) return { success: false, message: "User not found" };

    const isManager = user.rooms.some((membership) => membership.role === "MANAGER");
    const isAssignedUser = marketDate.userId === user.id;

    if (!isManager && !isAssignedUser) {
      return { success: false, message: "You are not authorized to update this market date" };
    }

    const updatedMarketDate = await prisma.marketDate.update({
      where: { id },
      data: { status: validatedData.status },
    });

    return { success: true, marketDate: updatedMarketDate };
  } catch (error: any) {
    console.error("Error updating market date:", error);
    return { success: false, message: "Failed to update market date" };
  }
}
