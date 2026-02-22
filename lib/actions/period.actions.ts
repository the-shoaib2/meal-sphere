"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import * as PeriodService from "@/lib/services/period-service";
import { PeriodStatus } from "@prisma/client";

// Re-export types from service
export type { CreatePeriodData } from "@/lib/services/period-service";

/**
 * Validates that the current user is authenticated and is a member of the specified group.
 * Returns the user's ID if successful, throws an error otherwise.
 */
async function validateMembership(groupId: string): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const member = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId: groupId,
      },
    },
  });

  if (!member) {
    throw new Error("Access denied to this group");
  }

  return userId;
}

export async function createPeriodAction(
  groupId: string,
  data: PeriodService.CreatePeriodData
) {
  try {
    const userId = await validateMembership(groupId);
    
    // Convert startDate/endDate strings to Dates if they aren't already
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    const result = await PeriodService.startPeriod(groupId, userId, {
      ...data,
      startDate,
      endDate,
    });
    
    // We cannot return Prisma JSON values containing Date objects directly to client without serialization sometimes, 
    // but Next.js Server Actions automatically handle Date objects.
    return { success: true, period: result.period };
  } catch (error: any) {
    console.error("Error in createPeriodAction:", error);
    return { success: false, message: error.message || "Failed to create period" };
  }
}

export async function endPeriodAction(
  groupId: string,
  periodId: string,
  endDate?: Date
) {
  try {
    const userId = await validateMembership(groupId);
    const result = await PeriodService.endPeriod(groupId, userId, endDate, periodId);
    return { success: true, period: result };
  } catch (error: any) {
    console.error("Error in endPeriodAction:", error);
    return { success: false, message: error.message || "Failed to end period" };
  }
}

export async function lockPeriodAction(
  groupId: string,
  periodId: string
) {
  try {
    const userId = await validateMembership(groupId);
    const result = await PeriodService.lockPeriod(groupId, userId, periodId);
    
    if (typeof result === "string") {
       throw new Error(result); // The service sometimes returns string error messages
    }
    
    return { success: true, period: result };
  } catch (error: any) {
    console.error("Error in lockPeriodAction:", error);
    return { success: false, message: error.message || "Failed to lock period" };
  }
}

export async function unlockPeriodAction(
  groupId: string,
  periodId: string,
  status: PeriodStatus = PeriodStatus.ENDED
) {
  try {
    const userId = await validateMembership(groupId);
    const result = await PeriodService.unlockPeriod(groupId, userId, periodId, status);
    return { success: true, period: result };
  } catch (error: any) {
    console.error("Error in unlockPeriodAction:", error);
    return { success: false, message: error.message || "Failed to unlock period" };
  }
}

export async function archivePeriodAction(
  groupId: string,
  periodId: string
) {
  try {
    const userId = await validateMembership(groupId);
    const result = await PeriodService.archivePeriod(groupId, userId, periodId);
    return { success: true, period: result };
  } catch (error: any) {
    console.error("Error in archivePeriodAction:", error);
    return { success: false, message: error.message || "Failed to archive period" };
  }
}

export async function updatePeriodAction(
    groupId: string,
    periodId: string,
    data: Partial<PeriodService.CreatePeriodData>
) {
    try {
        const userId = await validateMembership(groupId);
        
        // Convert dates if needed
        const updateData = { ...data };
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const result = await PeriodService.updatePeriod(groupId, userId, periodId, updateData);
        return { success: true, period: result };
    } catch (error: any) {
        console.error("Error in updatePeriodAction:", error);
        return { success: false, message: error.message || "Failed to update period" };
    }
}

export async function restartPeriodAction(
  groupId: string,
  periodId: string,
  newName?: string,
  withData: boolean = false
) {
  try {
    const userId = await validateMembership(groupId);
    const result = await PeriodService.restartPeriod(groupId, userId, periodId, newName, withData);
    return { success: true, period: result };
  } catch (error: any) {
    console.error("Error in restartPeriodAction:", error);
    return { success: false, message: error.message || "Failed to restart period" };
  }
}

export async function deletePeriodAction(
  groupId: string,
  periodId: string
) {
  try {
    const userId = await validateMembership(groupId);
    const result = await PeriodService.deletePeriod(groupId, userId, periodId);
    return { success: true, result };
  } catch (error: any) {
    console.error("Error in deletePeriodAction:", error);
    return { success: false, message: error.message || "Failed to delete period" };
  }
}
