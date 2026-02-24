"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import * as PeriodService from "@/lib/services/period-service";
import { PeriodStatus } from "@prisma/client";
import { validateAction, Permission } from "@/lib/auth/group-auth";

// Re-export types from service
export type { CreatePeriodData } from "@/lib/services/period-service";

/**
 * Validates basic membership access for viewing periods.
 */
async function validateMembership(groupId: string): Promise<string> {
  const result = await validateAction(groupId, Permission.VIEW_GROUP);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.userId;
}

export async function createPeriodAction(
  groupId: string,
  data: PeriodService.CreatePeriodData
) {
  try {
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
    
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
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
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
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
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
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
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
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
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
        const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
        
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
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
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
    const auth = await validateAction(groupId, Permission.MANAGE_MEALS);
    if (!auth.success) throw new Error(auth.error);
    const userId = auth.userId;
    const result = await PeriodService.deletePeriod(groupId, userId, periodId);
    return { success: true, result };
  } catch (error: any) {
    console.error("Error in deletePeriodAction:", error);
    return { success: false, message: error.message || "Failed to delete period" };
  }
}

export async function getPeriodsAction(groupId: string, includeArchived: boolean = false) {
  try {
    const userId = await validateMembership(groupId);
    
    // Lazy check: Ensure monthly period logic is enforced when listing periods
    try {
      await PeriodService.ensureMonthPeriod(groupId, userId);
    } catch (e) {
      console.warn('Failed to ensure monthly period:', e);
      // Continue anyway to show existing periods
    }

    const periods = await PeriodService.getPeriods(groupId, includeArchived);
    return { success: true, periods };
  } catch (error: any) {
    // Handle database schema errors gracefully as empty array
    if (error.message?.includes('Unknown table') || error.message?.includes('MealPeriod')) {
      return { success: true, periods: [] };
    }
    console.error('Error in getPeriodsAction:', error);
    return { success: false, message: error.message || 'Failed to fetch periods' };
  }
}

export async function getPeriodAction(groupId: string, periodId: string) {
  try {
    await validateMembership(groupId);
    const period = await PeriodService.getPeriod(periodId, groupId);
    
    if (!period) {
      return { success: false, message: 'Period not found', period: null };
    }
    return { success: true, period };
  } catch (error: any) {
    if (error.message?.includes('Unknown table') || error.message?.includes('Period not found')) {
      return { success: false, message: 'Period not found', period: null };
    }
    console.error('Error in getPeriodAction:', error);
    return { success: false, message: error.message || 'Failed to fetch period details' };
  }
}

export async function getPeriodSummaryAction(groupId: string, periodId: string) {
  try {
    await validateMembership(groupId);
    const summary = await PeriodService.calculatePeriodSummary(periodId, groupId);
    return { success: true, summary };
  } catch (error: any) {
    if (error.message?.includes('Unknown table') || error.message?.includes('Period not found')) {
      return { success: false, message: 'Period not found', summary: null };
    }
    console.error('Error in getPeriodSummaryAction:', error);
    return { success: false, message: error.message || 'Failed to fetch period summary' };
  }
}

export async function getPeriodsByMonthAction(groupId: string, year: number, month: number) {
  try {
    await validateMembership(groupId);
    const periods = await PeriodService.getPeriodsByMonth(groupId, year, month);
    return { success: true, periods };
  } catch (error: any) {
    if (error.message?.includes('Unknown table') || error.message?.includes('MealPeriod')) {
      return { success: true, periods: [] };
    }
    console.error('Error in getPeriodsByMonthAction:', error);
    return { success: false, message: error.message || 'Failed to fetch periods by month' };
  }
}

