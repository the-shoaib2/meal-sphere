import { prisma } from './prisma';
import { PeriodStatus, Role } from '@prisma/client';
import { createNotification, notifyRoomMembersBatch } from '../utils/notification-utils';
import { NotificationType } from '@prisma/client';
import { unstable_cache, revalidateTag as _revalidateTag, revalidatePath } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { invalidatePeriodCache } from '@/lib/cache/cache-invalidation';
import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Helper to invalidate all caches related to periods and groups
 */
function invalidatePeriodCaches(roomId: string, periodId?: string) {
  // 1. Invalidate Tags for unstable_cache
  revalidateTag(`group-${roomId}`, 'max');
  revalidateTag('periods', 'max');
  if (periodId) {
    revalidateTag(`period-${periodId}`, 'max');
  }

  // 2. Invalidate Paths for SSR Pages
  revalidatePath('/(auth)/dashboard', 'layout');
  revalidatePath('/(auth)/periods', 'layout');
  revalidatePath('/dashboard');
  revalidatePath('/periods');
  if (periodId) {
    revalidatePath(`/periods/${periodId}`);
  }
}

export interface PeriodSummary {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  status: PeriodStatus;
  isLocked: boolean;
  totalMeals: number;
  totalGuestMeals: number;
  totalShoppingAmount: number;
  totalPayments: number;
  totalExtraExpenses: number;
  memberCount: number;
  activeMemberCount: number;
  openingBalance: number;
  closingBalance: number | null;
  carryForward: boolean;
}

export interface CreatePeriodData {
  name: string;
  startDate: Date;
  endDate?: Date | null;
  openingBalance?: number;
  carryForward?: boolean;
  notes?: string;
}

/**
 * Ensure a period exists for the current month if in MONTHLY mode.
 * Ends previous periods if necessary.
 */
export async function ensureMonthPeriod(groupId: string, userId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: groupId },
    select: { periodMode: true },
  });

  if (room?.periodMode !== 'MONTHLY') {
    return;
  }

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const monthName = format(now, 'MMMM yyyy');

  const activePeriod = await prisma.mealPeriod.findFirst({
    where: {
      roomId: groupId,
      status: PeriodStatus.ACTIVE,
      deletedAt: null,
    },
  });

  if (activePeriod) {
    const isPreviousMonth = activePeriod.startDate < currentMonthStart;
    if (isPreviousMonth) {
      await endPeriod(groupId, userId, endOfMonth(activePeriod.startDate));
    } else {
      return;
    }
  }

  const existingMonthPeriod = await prisma.mealPeriod.findFirst({
    where: {
      roomId: groupId,
      name: monthName,
      deletedAt: null,
    },
  });

  if (!existingMonthPeriod) {
    const lastEndedPeriod = await prisma.mealPeriod.findFirst({
      where: { roomId: groupId, status: PeriodStatus.ENDED, deletedAt: null },
      orderBy: { endDate: 'desc' },
    });

    let openingBalance = 0;
    if (lastEndedPeriod && lastEndedPeriod.carryForward && lastEndedPeriod.closingBalance !== null) {
      openingBalance = lastEndedPeriod.closingBalance;
    }

    await startPeriod(groupId, userId, {
      name: monthName,
      startDate: currentMonthStart,
      endDate: null,
      openingBalance,
      carryForward: false,
    });
  }
}

/**
 * Validate period uniqueness for a group
 */
export async function validatePeriodUniqueness(roomId: string, data: CreatePeriodData, excludePeriodId?: string) {
  let originalName = data.name;
  let counter = 1;
  let finalName = originalName;

  while (true) {
    const existing = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        name: finalName,
        deletedAt: null,
        ...(excludePeriodId && { id: { not: excludePeriodId } }),
      },
      select: { id: true }
    });

    if (!existing) {
      data.name = finalName;
      break;
    }

    counter++;
    finalName = `${originalName} (${counter})`;
  }

  if (data.endDate) {
    const overlappingPeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        deletedAt: null,
        ...(excludePeriodId && { id: { not: excludePeriodId } }),
        OR: [
          {
            startDate: { lte: data.startDate },
            endDate: { gte: data.startDate },
          },
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.endDate },
          },
          {
            startDate: { gte: data.startDate },
            endDate: { lte: data.endDate },
          },
        ],
      },
    });

    if (overlappingPeriod) {
      const endDateStr = overlappingPeriod.endDate ? overlappingPeriod.endDate.toLocaleDateString() : 'No end date';
      throw new Error(`Period dates overlap with existing period "${overlappingPeriod.name}" (${overlappingPeriod.startDate.toLocaleDateString()} - ${endDateStr}). Each group can only have one period active at a time.`);
    }
  }
}

/**
 * Start a new meal period
 */
export async function startPeriod(
  roomId: string,
  userId: string,
  data: CreatePeriodData
) {
  // 1. Run all validation checks in parallel
  const [existingActivePeriod, overlappingPeriod, uniqueName] = await Promise.all([
    // Check for existing active period
    prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: PeriodStatus.ACTIVE,
        deletedAt: null,
      },
    }),
    // Check for date overlaps (if end date exists)
    data.endDate ? prisma.mealPeriod.findFirst({
      where: {
        roomId,
        deletedAt: null,
        OR: [
          { startDate: { lte: data.startDate }, endDate: { gte: data.startDate }, },
          { startDate: { lte: data.endDate }, endDate: { gte: data.endDate }, },
          { startDate: { gte: data.startDate }, endDate: { lte: data.endDate }, },
        ],
      },
    }) : Promise.resolve(null),
    // Calculate unique name
    (async () => {
       let originalName = data.name;
       let counter = 1;
       let finalName = originalName;
       while (true) {
         const existing = await prisma.mealPeriod.findFirst({
           where: { roomId, name: finalName, deletedAt: null },
           select: { id: true }
         });
         if (!existing) return finalName;
         counter++;
         finalName = `${originalName} (${counter})`;
       }
    })()
  ]);

  // 2. Process validation results
  if (existingActivePeriod) {
    throw new Error(`There is already an active period "${existingActivePeriod.name}" for this group. Please end it first before starting a new period.`);
  }

  if (data.endDate && data.startDate >= data.endDate) {
    throw new Error('Start date must be before end date');
  }

  if (overlappingPeriod) {
    const endDateStr = overlappingPeriod.endDate ? overlappingPeriod.endDate.toLocaleDateString() : 'No end date';
    throw new Error(`Period dates overlap with existing period "${overlappingPeriod.name}" (${overlappingPeriod.startDate.toLocaleDateString()} - ${endDateStr}). Each group can only have one period active at a time.`);
  }

  const period = await prisma.mealPeriod.create({
    data: {
      name: uniqueName,
      startDate: data.startDate,
      endDate: data.endDate,
      openingBalance: data.openingBalance || 0,
      carryForward: data.carryForward || false,
      notes: data.notes,
      roomId,
      createdBy: userId,
      status: PeriodStatus.ACTIVE,
    },
  });

  invalidatePeriodCaches(roomId, period.id);

  return {
    period,
  };
}

/**
 * End the current active period
 */
export async function endPeriod(roomId: string, userId: string, endDate?: Date, periodId?: string) {
  let currentPeriod;

  if (periodId) {
    currentPeriod = await prisma.mealPeriod.findFirst({
      where: {
        id: periodId,
        roomId,
        deletedAt: null,
      },
    });

    if (!currentPeriod) {
      throw new Error('Period not found');
    }

    if (currentPeriod.status !== PeriodStatus.ACTIVE) {
      throw new Error(`Cannot end period '${currentPeriod.name}' because it is not active (Status: ${currentPeriod.status})`);
    }
  } else {
    currentPeriod = await getCurrentPeriod(roomId);
    if (!currentPeriod) {
      throw new Error('No active period found');
    }
  }

  const actualEndDate = endDate || new Date();

  const updatedPeriod = await prisma.mealPeriod.update({
    where: { id: currentPeriod.id },
    data: {
      endDate: actualEndDate,
      status: PeriodStatus.ENDED,
    },
  });

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { periodMode: true }
  });

  if (room?.periodMode === 'MONTHLY') {
    await prisma.room.update({
      where: { id: roomId },
      data: { periodMode: 'CUSTOM' }
    });
  }

  invalidatePeriodCaches(roomId, currentPeriod.id);

  return updatedPeriod;
}

/**
 * Lock a period to prevent further edits
 */
export async function lockPeriod(roomId: string, userId: string, periodId: string) {
  const period = await prisma.mealPeriod.findFirst({
    where: {
      id: periodId,
      roomId,
      deletedAt: null,
    },
  });

  if (!period) {
    return ('Period not found');
  }

  if (period.isLocked) {
    return ('Period is already locked');
  }

  const updatedPeriod = await prisma.mealPeriod.update({
    where: { id: periodId },
    data: {
      isLocked: true,
      status: PeriodStatus.LOCKED,
    },
  });

  invalidatePeriodCaches(roomId, periodId);

  return updatedPeriod;
}

/**
 * Unlock a period to allow edits
 */
export async function unlockPeriod(roomId: string, userId: string, periodId: string, status: PeriodStatus = PeriodStatus.ENDED) {
  const period = await prisma.mealPeriod.findFirst({
    where: {
      id: periodId,
      roomId,
      deletedAt: null,
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  if (!period.isLocked && period.status !== PeriodStatus.ARCHIVED) {
    throw new Error('Period is not locked or archived');
  }

  const updatedPeriod = await prisma.mealPeriod.update({
    where: { id: periodId },
    data: {
      isLocked: false,
      status,
    },
  });

  invalidatePeriodCaches(roomId, periodId);

  return updatedPeriod;
}

/**
 * Get the current active period for a specific group
 */
export async function getCurrentPeriod(roomId: string) {
  if (!roomId) {
    throw new Error('Room ID is required to get current period');
  }

  return await prisma.mealPeriod.findFirst({
    where: {
      roomId,
      status: PeriodStatus.ACTIVE,
      deletedAt: null,
    },
  });
}

/**
 * Get all periods for a specific group
 */
export async function getPeriods(roomId: string, includeArchived = false) {
  if (!roomId) {
    throw new Error('Room ID is required to get periods');
  }

  const whereClause: any = { roomId, deletedAt: null };

  if (!includeArchived) {
    whereClause.status = {
      in: [PeriodStatus.ACTIVE, PeriodStatus.ENDED, PeriodStatus.LOCKED],
    };
  }

  return await prisma.mealPeriod.findMany({
    where: whereClause,
    orderBy: {
      startDate: 'desc',
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
      isLocked: true,
      openingBalance: true,
      closingBalance: true,
      roomId: true,
    }
  });
}

/**
 * Get a specific period by ID (with group validation)
 */
export async function getPeriod(periodId: string, roomId?: string) {
  if (!periodId) {
    throw new Error('Period ID is required');
  }

  const whereClause: any = { id: periodId, deletedAt: null };

  if (roomId) {
    whereClause.roomId = roomId;
  }

  const period = await prisma.mealPeriod.findUnique({
    where: whereClause,
    include: {
      room: {
        select: {
          id: true,
          name: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  if (roomId && period.roomId !== roomId) {
    throw new Error('Period does not belong to the specified group');
  }

  return period;
}

/**
 * Calculate period summary with all financial and meal data
 */
export async function calculatePeriodSummary(periodId: string, roomId?: string): Promise<PeriodSummary> {
  const [
    period,
    mealsCount,
    guestMealsAgg,
    shoppingAgg,
    paymentsAgg,
    extraExpensesAgg,
    memberCount
  ] = await Promise.all([
    prisma.mealPeriod.findFirst({
      where: { id: periodId, deletedAt: null },
    }),

    prisma.meal.count({
      where: {
        periodId,
        ...(roomId && { roomId }),
      },
    }),

    prisma.guestMeal.aggregate({
      where: {
        periodId,
        ...(roomId && { roomId }),
      },
      _sum: { count: true },
    }),

    prisma.shoppingItem.aggregate({
      where: {
        periodId,
        purchased: true,
        ...(roomId && { roomId }),
      },
      _sum: { quantity: true },
    }),

    prisma.payment.aggregate({
      where: {
        periodId,
        status: 'COMPLETED',
        ...(roomId && { roomId }),
      },
      _sum: { amount: true },
    }),

    prisma.extraExpense.aggregate({
      where: {
        periodId,
        ...(roomId && { roomId }),
      },
      _sum: { amount: true },
    }),

    roomId ? prisma.roomMember.count({
      where: {
        roomId: roomId,
        isCurrent: true,
        isBanned: false,
      },
    }) : Promise.resolve(0)
  ]);

  if (!period) {
    throw new Error('Period not found');
  }

  if (roomId && period.roomId !== roomId) {
    throw new Error('Period does not belong to the specified group');
  }

  let finalMemberCount = memberCount;
  // Use the memberCount from Promise.all if roomId was provided,
  // otherwise fetch it here.
  if (!roomId) {
    finalMemberCount = await prisma.roomMember.count({
      where: {
        roomId: period.roomId,
        isCurrent: true,
        isBanned: false
      }
    });
  }

  const { id, name, startDate, endDate, status, isLocked, openingBalance, closingBalance, carryForward } = period;

  return {
    id,
    name,
    startDate,
    endDate: endDate || null,
    status,
    isLocked,
    totalMeals: mealsCount,
    totalGuestMeals: guestMealsAgg._sum.count || 0,
    totalShoppingAmount: shoppingAgg._sum.quantity || 0,
    totalPayments: paymentsAgg._sum.amount || 0,
    totalExtraExpenses: extraExpensesAgg._sum.amount || 0,
    memberCount: finalMemberCount,
    activeMemberCount: finalMemberCount,
    openingBalance,
    closingBalance,
    carryForward,
  };
}

/**
 * Archive a period
 */
export async function archivePeriod(roomId: string, userId: string, periodId: string) {
  const period = await prisma.mealPeriod.findFirst({
    where: {
      id: periodId,
      roomId,
      deletedAt: null,
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  const archiveData: any = {
      status: PeriodStatus.ARCHIVED,
  };

  let wasActive = false;
  if (period.status === PeriodStatus.ACTIVE) {
      archiveData.endDate = new Date();
      wasActive = true;
  }

  const updatedPeriod = await prisma.mealPeriod.update({
    where: { id: periodId },
    data: archiveData,
  });

  if (wasActive) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { periodMode: true }
    });

    if (room?.periodMode === 'MONTHLY') {
      await prisma.room.update({
        where: { id: roomId },
        data: { periodMode: 'CUSTOM' }
      });
    }
  }

  invalidatePeriodCaches(roomId, periodId);

  return updatedPeriod;
}

/**
 * Update a period's details
 */
export async function updatePeriod(
  roomId: string,
  userId: string,
  periodId: string,
  data: Partial<CreatePeriodData>
) {
  const period = await prisma.mealPeriod.findFirst({
    where: {
      id: periodId,
      roomId,
      deletedAt: null,
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  // If name is changing, ensure it's unique
  let finalName = data.name;
  if (data.name && data.name !== period.name) {
    const tempDate = data.startDate || period.startDate;
    const tempEndDate = data.endDate === undefined ? period.endDate : data.endDate;
    
    // Validate uniqueness and overlaps
    await validatePeriodUniqueness(roomId, {
      name: data.name,
      startDate: tempDate,
      endDate: tempEndDate,
    }, periodId);
    
    finalName = data.name;
  }

  const updatedPeriod = await prisma.mealPeriod.update({
    where: { id: periodId },
    data: {
      ...(finalName && { name: finalName }),
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
      ...(data.openingBalance !== undefined && { openingBalance: data.openingBalance }),
      ...(data.carryForward !== undefined && { carryForward: data.carryForward }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  invalidatePeriodCaches(roomId, periodId);

  return updatedPeriod;
}

/**
 * Delete a period and its primary associations
 */
export async function deletePeriod(roomId: string, userId: string, periodId: string) {
  const period = await prisma.mealPeriod.findFirst({
    where: {
      id: periodId,
      roomId,
      deletedAt: null,
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  // Soft delete instead of hard delete to preserve financial records and history.
  await prisma.mealPeriod.update({
    where: { id: periodId },
    data: { deletedAt: new Date() }
  });

  invalidatePeriodCaches(roomId, periodId);

  return { success: true };
}

/**
 * Restart a period (create a new period with the same settings)
 */
export async function restartPeriod(roomId: string, userId: string, periodId: string, newName?: string, withData: boolean = false) {
  try {
    const originalPeriod = await prisma.mealPeriod.findFirst({
      where: {
        id: periodId,
        roomId,
        deletedAt: null,
      },
    });

    if (!originalPeriod) {
      throw new Error('Original period not found');
    }

    const existingActivePeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: PeriodStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (existingActivePeriod) {
      throw new Error('Cannot restart period while another period is active. End the current period first.');
    }

    let periodName = newName;
    if (!periodName) {
      let baseName = `${originalPeriod.name} (Restarted)`;
      let counter = 1;

      while (true) {
        const existingPeriod = await prisma.mealPeriod.findFirst({
          where: {
            roomId,
            name: baseName,
            deletedAt: null,
          },
        });

        if (!existingPeriod) {
          periodName = baseName;
          break;
        }

        baseName = `${originalPeriod.name} (Restarted ${counter})`;
        counter++;
      }
    }

    const newPeriod = await prisma.mealPeriod.create({
      data: {
        name: periodName,
        startDate: new Date(),
        endDate: null,
        status: PeriodStatus.ACTIVE,
        isLocked: false,
        openingBalance: originalPeriod.carryForward ? (originalPeriod.closingBalance || 0) : 0,
        closingBalance: null,
        carryForward: originalPeriod.carryForward,
        notes: originalPeriod.notes,
        roomId,
        createdBy: userId,
      },
    });

    if (withData) {
      await copyPeriodData(originalPeriod.id, newPeriod.id);
    }

    invalidatePeriodCaches(roomId, newPeriod.id);

    return newPeriod;
  } catch (error) {
    console.error('Error restarting period:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to restart period. Please try again.');
  }
}

/**
 * Copy all data from one period to another
 */
export async function copyPeriodData(fromPeriodId: string, toPeriodId: string) {
  try {
    await prisma.meal.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

    await prisma.guestMeal.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

    await prisma.shoppingItem.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

    await prisma.extraExpense.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

    await prisma.payment.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

    await prisma.marketDate.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

    await prisma.accountTransaction.updateMany({
      where: { periodId: fromPeriodId },
      data: { periodId: toPeriodId },
    });

  } catch (error) {
    console.error('Error copying period data:', error);
    throw new Error('Failed to copy period data. Please try again without data copying.');
  }
}

/**
 * Get periods by month for reporting
 */
export async function getPeriodsByMonth(roomId: string, year: number, month: number) {
  const startOfMonthVal = new Date(year, month - 1, 1);
  const endOfMonthVal = new Date(year, month, 0, 23, 59, 59, 999);

  return await prisma.mealPeriod.findMany({
    where: {
      roomId,
      OR: [
        {
          startDate: {
            gte: startOfMonthVal,
            lte: endOfMonthVal,
          },
        },
        {
          endDate: {
            gte: startOfMonthVal,
            lte: endOfMonthVal,
          },
        },
        {
          AND: [
            {
              startDate: {
                lte: startOfMonthVal,
              },
            },
            {
              endDate: {
                gte: endOfMonthVal,
              },
            },
          ],
        },
      ],
    },
    orderBy: {
      startDate: 'desc',
    },
  });
}

/**
 * Fetches all period-related data for a user in a specific group
 */
export async function fetchPeriodsData(userId: string, groupId: string, includeArchived: boolean = false) {
  const cacheKey = `periods-data-${userId}-${groupId}-${includeArchived}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const [
        periods,
        activePeriod,
        periodStats,
        roomData,
        membership
      ] = await Promise.all([
        getPeriods(groupId, includeArchived),
        getCurrentPeriod(groupId),
        prisma.mealPeriod.aggregate({
          where: {
            roomId: groupId,
            ...(includeArchived ? {} : { status: 'ACTIVE' })
          },
          _count: {
            id: true
          },
          _sum: {
            openingBalance: true
          }
        }),
        prisma.room.findUnique({
          where: {
            id: groupId
          },
          select: {
            id: true,
            name: true,
            memberCount: true,
            isPrivate: true,
            periodMode: true
          }
        }),
        prisma.roomMember.findUnique({
          where: {
            userId_roomId: {
              userId: userId,
              roomId: groupId
            }
          },
          select: {
            role: true,
            isBanned: true
          }
        })
      ]);

      let initialPeriodSummary = null;
      if (activePeriod) {
         try {
           initialPeriodSummary = await calculatePeriodSummary(activePeriod.id, groupId);
         } catch (e) {
           console.error("Failed to pre-fetch active period summary", e);
         }
      }

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        periods,
        activePeriod,
        initialPeriodSummary,
        periodStats: {
          totalPeriods: periodStats._count.id,
          totalOpeningBalance: periodStats._sum.openingBalance || 0
        },
        roomData,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'periods-data'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, `group-${groupId}`, 'periods'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches detailed data for a specific period
 */
export async function fetchPeriodDetails(userId: string, groupId: string, periodId: string) {
  const cacheKey = `period-details-${userId}-${groupId}-${periodId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const [
        period,
        mealCount,
        expenseCount,
        paymentCount,
        shoppingCount,
        memberActivity
      ] = await Promise.all([
        prisma.mealPeriod.findUnique({
          where: {
            id: periodId
          },
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }),
        prisma.meal.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        prisma.extraExpense.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        prisma.payment.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        prisma.shoppingItem.count({
          where: {
            periodId: periodId,
            roomId: groupId
          }
        }),
        prisma.meal.groupBy({
          by: ['userId'],
          where: {
            periodId: periodId,
            roomId: groupId
          },
          _count: {
            userId: true
          }
        })
      ]);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        period,
        statistics: {
          totalMeals: mealCount,
          totalExpenses: expenseCount,
          totalPayments: paymentCount,
          totalShoppingItems: shoppingCount,
          activeMemberCount: memberActivity.length
        },
        memberActivity: memberActivity.map(m => ({
          userId: m.userId,
          mealCount: m._count.userId
        })),
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'period-details'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, `period-${periodId}`, 'periods'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

export const PeriodService = {
  ensureMonthPeriod,
  validatePeriodUniqueness,
  startPeriod,
  endPeriod,
  lockPeriod,
  unlockPeriod,
  getCurrentPeriod,
  getPeriods,
  getPeriod,
  updatePeriod,
  deletePeriod,
  calculatePeriodSummary,
  archivePeriod,
  restartPeriod,
  copyPeriodData,
  getPeriodsByMonth,
  fetchPeriodsData
};