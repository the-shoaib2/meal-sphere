"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from '@/lib/services/prisma';
import { invalidateMealCache } from "@/lib/cache/cache-invalidation";
import { MealType } from "@prisma/client";
import { 
  canUserEditMeal, 
  formatDateSafe, 
  parseDateSafe 
} from '@/lib/utils/period-utils-shared';
import { getPeriodForDate } from '@/lib/utils/period-utils';

/**
 * --- Mutation Actions ---
 */

export async function toggleMeal(roomId: string, userId: string, dateStr: string, type: MealType, action: 'add' | 'remove', periodId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Standardize to UTC Midnight using the project's safe parser
    const targetDate = parseDateSafe(dateStr);

    const [membership, settings, targetPeriod] = await Promise.all([
        prisma.roomMember.findUnique({ where: { userId_roomId: { userId: (session.user as any).id, roomId } } }),
        prisma.mealSettings.findUnique({ where: { roomId } }),
        periodId 
            ? prisma.mealPeriod.findUnique({ where: { id: periodId } })
            : getPeriodForDate(roomId, targetDate)
    ]);

    const userRole = membership?.role || null;
    const isPrivileged = userRole && ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(userRole);

    if (userId !== (session.user as any).id && !isPrivileged) {
        return { success: false, error: "Unauthorized to edit others meals" };
    }

    const targetPeriodId = targetPeriod?.id || undefined;

    // Check if period is locked (if it exists)
    if (targetPeriod?.isLocked) {
        return { success: false, error: "This period is locked" };
    }

    // Time Cutoff Validation for regular users
    if (!isPrivileged) {
        const canEdit = canUserEditMeal(targetDate, type, userRole, settings, targetPeriod);
        if (!canEdit) {
            return { success: false, error: "Meal time cutoff has passed or period is locked" };
        }
    }

    if (action === 'remove') {
        try {
            // Use deleteMany with range to be resilient to potential timestamp shifts in existing data
            const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
            await prisma.meal.deleteMany({
                where: {
                    userId,
                    roomId,
                    type,
                    date: {
                        gte: targetDate,
                        lt: nextDay
                    }
                }
            });
            await invalidateMealCache(roomId);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: "Failed to remove meal" };
        }
    } else {
        try {
            const newMeal = await prisma.meal.create({
                data: {
                    roomId,
                    userId,
                    date: targetDate,
                    type,
                    periodId: targetPeriodId
                },
                include: { user: { select: { id: true, name: true, image: true, email: true } } }
            });
            await invalidateMealCache(roomId); // Invalidate cache after create
            return { success: true, meal: newMeal };
        } catch (error: any) {
            if ((error as any).code === 'P2002') return { success: false, conflict: true };
            console.error('[toggleMeal error]', error);
            return { success: false };
        }
    }
}

export async function addGuestMeal(data: { roomId: string; userId: string; dateStr: string; type: MealType; count: number; periodId?: string }) {
    const { roomId, userId, dateStr, type, count, periodId } = data;
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Authorization check
    if (userId !== (session.user as any).id) {
        try {
            await assertAdminRights((session.user as any).id, roomId, "Unauthorized to edit others guest meals");
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Standardize to UTC Midnight using the project's safe parser
    const targetDate = parseDateSafe(dateStr);

    // Fetch dependencies in parallel
    const [settings, todayGuestMeals, membership, targetPeriod] = await Promise.all([
        prisma.mealSettings.findUnique({ where: { roomId } }),
        prisma.guestMeal.findMany({ where: { userId, roomId, date: targetDate } }),
        prisma.roomMember.findUnique({ where: { userId_roomId: { userId: (session.user as any).id, roomId } } }),
        periodId 
            ? prisma.mealPeriod.findUnique({ where: { id: periodId } })
            : getPeriodForDate(roomId, targetDate)
    ]);

    if (targetPeriod?.isLocked) {
        return { success: false, error: "This period is locked" };
    }

    const isPrivileged = membership && ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(membership.role);

    // Time Cutoff Validation (Same as regular meals)
    if (!isPrivileged) {
        const canEdit = canUserEditMeal(targetDate, type, membership?.role || null, settings, targetPeriod);
        if (!canEdit) {
            return { success: false, error: "Guest meal time cutoff has passed" };
        }
    }

    if (settings && !settings.allowGuestMeals) {
        return { success: false, error: "Guest meals are not allowed in this group" };
    }

    // Prevent negative counts
    if (count < 0) {
        return { success: false, error: "Guest count cannot be negative" };
    }

    const limit = settings?.guestMealLimit || 5;
    const otherTypesTotal = todayGuestMeals
        .filter(m => m.type !== type)
        .reduce((sum, m) => sum + m.count, 0);

    // In patch, count is the new total for that type
    if (count <= 0) {
        const existing = todayGuestMeals.find(m => m.type === type);
        if (existing) {
            await prisma.guestMeal.delete({ where: { id: existing.id } });
            await invalidateMealCache(roomId);
            return { success: true, data: { ...existing, count: 0 } as any };
        }
        return { success: true, data: { count: 0, type, date: targetDate, userId, roomId } as any };
    }

    if (!isPrivileged && (otherTypesTotal + count > limit)) {
        const remaining = limit - otherTypesTotal;
        return { success: false, error: `Limit exceeded. Remaining: ${remaining < 0 ? 0 : remaining}` };
    }

    // Determine period and lock status
    const targetPeriodId = targetPeriod?.id || null;

    const guestMeal = await prisma.guestMeal.upsert({
        where: { guestMealIdentifier: { userId, roomId, date: targetDate, type } } as any,
        update: { count, periodId: targetPeriodId, updatedAt: new Date() },
        create: {
            userId,
            roomId,
            date: targetDate,
            type,
            count,
            periodId: targetPeriodId,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        include: { user: { select: { id: true, name: true, image: true } } }
    });

    await invalidateMealCache(roomId); // Invalidate cache after guest meal update
    return { success: true, data: guestMeal };
}

export async function updateMealSettings(roomId: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        await assertAdminRights((session.user as any).id, roomId, "Unauthorized");
    } catch (error: any) {
        return { success: false, error: error.message };
    }

    let settings = await prisma.mealSettings.findUnique({ where: { roomId } });
    if (!settings) settings = await prisma.mealSettings.create({ data: { ...createDefaultSettings(), roomId } });

    const updated = await prisma.mealSettings.update({
        where: { id: settings.id },
        data: { ...data, updatedAt: new Date() }
    });

    await invalidateMealCache(roomId);
    return { success: true, data: updated };
}

export async function updateAutoMealSettings(roomId: string, userId: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (userId !== (session.user as any).id) return { success: false, error: "Unauthorized" };

    // Single upsert replaces the old findUnique → conditional create → update chain
    const updated = await prisma.autoMealSettings.upsert({
        where: { userId_roomId: { userId, roomId } },
        create: { ...createDefaultAutoSettings(userId, roomId), ...data },
        update: { ...data, updatedAt: new Date() },
    });

    await invalidateMealCache(roomId);
    return { success: true, data: updated };
}

export async function deleteGuestMeal(guestMealId: string, userId: string, periodId?: string) {
    // Run session fetch and DB lookup in parallel for the first round-trip
    const [sessionResult, guestMeal] = await Promise.all([
        getServerSession(authOptions),
        prisma.guestMeal.findUnique({ where: { id: guestMealId } }),
    ]);

    if (!guestMeal) {
        console.log(`[GuestMeal] Not found (already deleted): ${guestMealId}`);
        return { success: true };
    }

    const session = sessionResult;
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const [membership, settings, targetPeriod] = await Promise.all([
        prisma.roomMember.findUnique({ where: { userId_roomId: { userId: (session.user as any).id, roomId: guestMeal.roomId } } }),
        prisma.mealSettings.findUnique({ where: { roomId: guestMeal.roomId } }),
        (guestMeal.periodId || periodId)
            ? prisma.mealPeriod.findUnique({ where: { id: guestMeal.periodId || periodId || "" } })
            : getPeriodForDate(guestMeal.roomId, guestMeal.date)
    ]);

    const userRole = membership?.role || null;
    const isPrivileged = userRole && ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(userRole);

    if (guestMeal.userId !== (session.user as any).id && !isPrivileged) {
        return { success: false, error: "Unauthorized to edit others guest meals" };
    }

    // Time Cutoff and Period Lock check
    if (!isPrivileged) {
        const canEdit = canUserEditMeal(guestMeal.date, guestMeal.type as any, userRole, settings, targetPeriod);
        if (!canEdit) {
            return { success: false, error: "Guest meal time cutoff has passed or period is locked" };
        }
    } else {
        // Even for privileged, check period lock
        if (targetPeriod?.isLocked) {
            return { success: false, error: "Cannot delete from a locked period" };
        }
    }

    await prisma.guestMeal.delete({
        where: { id: guestMealId }
    });

    await invalidateMealCache(guestMeal.roomId);
    return { success: true };
}

export async function triggerAutoMeals(roomId: string, dateStr: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        await assertAdminRights((session.user as any).id, roomId, "You don't have permission to trigger auto meals");
    } catch (error: any) {
        return { success: false, error: error.message };
    }

    const mealSettings = await prisma.mealSettings.findUnique({
      where: { roomId: roomId },
    })

    if (!mealSettings?.autoMealEnabled) {
      return { success: false, error: "Auto meal system is not enabled for this room" };
    }

    const autoMealSettingsList = await prisma.autoMealSettings.findMany({
      where: { 
        roomId: roomId,
        isEnabled: true,
      }
    })

    if (autoMealSettingsList.length === 0) {
      return { success: true, message: "No users have auto meal settings enabled" }
    }

    const targetDate = new Date(dateStr)
    const period = await getPeriodForDate(roomId, targetDate)
    
    if (period?.isLocked) {
        return { success: false, message: "Cannot trigger auto meals for a locked period" }
    }
    
    let processedCount = 0
    let skippedCount = 0

    const startOfDayUTC = new Date(targetDate)
    startOfDayUTC.setUTCHours(0, 0, 0, 0)
    const endOfDayUTC = new Date(targetDate)
    endOfDayUTC.setUTCHours(23, 59, 59, 999)
    const [existingMeals, existingGuestMeals] = await Promise.all([
      prisma.meal.findMany({
        where: {
          roomId: roomId,
          date: { gte: startOfDayUTC, lte: endOfDayUTC }
        }
      }),
      prisma.guestMeal.findMany({
        where: {
          roomId: roomId,
          date: { gte: startOfDayUTC, lte: endOfDayUTC }
        }
      })
    ]);
    const existingMealsByUserAndType = new Map<string, typeof existingMeals>();
    const mealCountByUser = new Map<string, number>();
    const guestMealCountByUser = new Map<string, number>();

    for (const m of existingMeals) {
      const key = `${m.userId}-${m.type}`;
      if (!existingMealsByUserAndType.has(key)) existingMealsByUserAndType.set(key, []);
      existingMealsByUserAndType.get(key)!.push(m);
      mealCountByUser.set(m.userId, (mealCountByUser.get(m.userId) || 0) + 1);
    }

    for (const gm of existingGuestMeals) {
      guestMealCountByUser.set(gm.userId, (guestMealCountByUser.get(gm.userId) || 0) + gm.count);
    }

    const newMealsToCreate: any[] = [];
    const newGuestMealsToCreate: any[] = [];

    // Force processing regardless of time since this is a manual trigger
    for (const autoSetting of autoMealSettingsList) {
      const userId = autoSetting.userId

      if (autoSetting.excludedDates.includes(dateStr)) {
        skippedCount++
        continue
      }

      const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'] as const
      
      for (const mealType of mealTypes) {
        const isEnabled = mealType === 'BREAKFAST' ? autoSetting.breakfastEnabled :
                         mealType === 'LUNCH' ? autoSetting.lunchEnabled :
                         autoSetting.dinnerEnabled

        if (!isEnabled || autoSetting.excludedMealTypes.includes(mealType)) continue
        const memKey = `${userId}-${mealType}`;
        if (existingMealsByUserAndType.has(memKey)) {
          continue
        }
        const currentCount = mealCountByUser.get(userId) || 0;
        if (currentCount >= (mealSettings.maxMealsPerDay || 3)) {
          continue
        }
        newMealsToCreate.push({
          userId: userId,
          roomId: roomId,
          date: startOfDayUTC,
          type: mealType,
          periodId: period?.id || null,
        });
        
        // Update local maps
        mealCountByUser.set(userId, currentCount + 1);
        processedCount++;

        // Handle Guest Meals if enabled
        if (autoSetting.guestMealEnabled) {
          const currentGuestCount = guestMealCountByUser.get(userId) || 0;
          if (currentGuestCount < (mealSettings.guestMealLimit || 5)) {
            newGuestMealsToCreate.push({
              userId,
              roomId,
              date: startOfDayUTC,
              type: mealType as MealType,
              count: 1,
              periodId: period?.id || null
            });
            guestMealCountByUser.set(userId, currentGuestCount + 1);
          }
        }
      }
    }

    // Bulk creation
    if (newMealsToCreate.length > 0) {
      await prisma.meal.createMany({
        data: newMealsToCreate,
        skipDuplicates: true,
      });
    }

    if (newGuestMealsToCreate.length > 0) {
      await prisma.guestMeal.createMany({
        data: newGuestMealsToCreate,
        skipDuplicates: true,
      });
    }

    if (processedCount > 0 || newGuestMealsToCreate.length > 0) {
      await invalidateMealCache(roomId);
    }

    return { 
      success: true, 
      message: `Auto meals processed: ${processedCount} meals and ${newGuestMealsToCreate.length} guest meals added.`,
      processedCount,
      guestMealsCount: newGuestMealsToCreate.length,
      skippedCount
    };
}

// Helpers
function createDefaultSettings() {
    return {
        breakfastTime: "08:00", lunchTime: "13:00", dinnerTime: "20:00",
        autoMealEnabled: false, mealCutoffTime: "22:00", maxMealsPerDay: 3,
        allowGuestMeals: true, guestMealLimit: 5
    };
}
function createDefaultAutoSettings(userId: string, roomId: string) {
    return {
        userId, roomId, isEnabled: false,
        breakfastEnabled: true, lunchEnabled: true, dinnerEnabled: true,
        guestMealEnabled: false, startDate: new Date(),
        excludedDates: [], excludedMealTypes: []
    };
}

async function assertAdminRights(userId: string, roomId: string, customMessage = "Unauthorized") {
    const membership = await prisma.roomMember.findUnique({ where: { userId_roomId: { userId, roomId } } });
    if (!membership || !['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(membership.role)) {
        throw new Error(customMessage);
    }
}
