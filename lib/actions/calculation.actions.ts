"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { 
    calculateRoomMealSummary, 
    calculateUserMealSummary, 
    getCurrentMonthRange 
} from "@/lib/meal-calculations";

export async function getCalculationsAction(roomId: string, targetUserId?: string, startDateParam?: string, endDateParam?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    if (!roomId) {
      return { success: false, message: "Room ID is required" };
    }

    const [roomMember, currentPeriod] = await Promise.all([
      prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: session.user.id, roomId } },
      }),
      prisma.mealPeriod.findFirst({
        where: { roomId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      })
    ]);

    if (!roomMember) {
      return { success: false, message: "You are not a member of this room" };
    }

    let startDate: Date;
    let endDate: Date;
    let periodId: string | undefined = undefined;

    if (currentPeriod) {
      startDate = currentPeriod.startDate;
      endDate = currentPeriod.endDate || new Date();
      periodId = currentPeriod.id;
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const monthRange = getCurrentMonthRange();
      startDate = monthRange.startDate;
      endDate = monthRange.endDate;
    }

    if (targetUserId) {
      const summary = await calculateUserMealSummary(targetUserId, roomId, startDate, endDate, periodId);
      return { success: true, summary };
    } else {
      const summary = await calculateRoomMealSummary(roomId, startDate, endDate, periodId);
      return { success: true, summary };
    }
  } catch (error: any) {
    console.error("Error calculating meal summary:", error);
    return { success: false, message: error.message || "Failed to calculate meal summary" };
  }
}
