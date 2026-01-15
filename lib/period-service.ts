import { prisma } from './prisma';
import { PeriodStatus, Role } from '@prisma/client';
import { createNotification, notifyAllRoomMembers } from './notification-utils';

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



import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface CreatePeriodData {
  name: string;
  startDate: Date;
  endDate?: Date | null;
  openingBalance?: number;
  carryForward?: boolean;
  notes?: string;
}

export class PeriodService {
  /**
   * Ensure a period exists for the current month if in MONTHLY mode.
   * Ends previous periods if necessary.
   */
  static async ensureMonthPeriod(groupId: string, userId: string): Promise<void> {
    // Check group mode
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

    // Check for active period
    const activePeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId: groupId,
        status: PeriodStatus.ACTIVE,
      },
    });

    // If active period exists
    if (activePeriod) {
      // Check if it's for a previous month
      const isPreviousMonth = activePeriod.startDate < currentMonthStart;

      if (isPreviousMonth) {
        // End the previous period
        // We use system/admin override style here since this is an automated system action
        // We might need to handle closing balance -> opening balance if we want full auto
        await this.endPeriod(groupId, userId, endOfMonth(activePeriod.startDate));
      } else {
        // Current period is valid, nothing to do
        return;
      }
    }

    // Double check if period for this month already exists (maybe ended or archived)
    const existingMonthPeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId: groupId,
        name: monthName,
      },
    });

    if (!existingMonthPeriod) {
      // Create new period for current month
      // We need to decide on opening balance. 
      // Ideally fetch last ended period and get its closing balance if carryForward is enabled.
      // For now, simpler implementation:

      const lastEndedPeriod = await prisma.mealPeriod.findFirst({
        where: { roomId: groupId, status: PeriodStatus.ENDED },
        orderBy: { endDate: 'desc' },
      });

      let openingBalance = 0;
      if (lastEndedPeriod && lastEndedPeriod.carryForward && lastEndedPeriod.closingBalance !== null) {
        openingBalance = lastEndedPeriod.closingBalance;
      }

      await this.startPeriod(groupId, userId, {
        name: monthName,
        startDate: currentMonthStart,
        endDate: null,
        openingBalance,
        carryForward: false, // Default to false for fresh monthly start? Or inherit? User didn't specify.
      });
    }
  }
  /**
   * Validate period uniqueness for a group
   */
  static async validatePeriodUniqueness(roomId: string, data: CreatePeriodData, excludePeriodId?: string) {
    // Check for duplicate period name
    const existingPeriodWithSameName = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        name: data.name,
        ...(excludePeriodId && { id: { not: excludePeriodId } }),
      },
    });

    if (existingPeriodWithSameName) {
      throw new Error(`A period with the name "${data.name}" already exists in this group. Please choose a different name.`);
    }

    // Check for overlapping periods (only if endDate is provided)
    if (data.endDate) {
      const overlappingPeriod = await prisma.mealPeriod.findFirst({
        where: {
          roomId,
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
  static async startPeriod(
    roomId: string,
    userId: string,
    data: CreatePeriodData
  ) {
    // Check if user has admin permissions
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!member || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      throw new Error('Insufficient permissions to start a period');
    }

    // Check if there's already an active period for this group
    const existingActivePeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: PeriodStatus.ACTIVE,
      },
    });

    if (existingActivePeriod) {
      throw new Error(`There is already an active period "${existingActivePeriod.name}" for this group. Please end it first before starting a new period.`);
    }

    // Validate dates (only if endDate is provided)
    if (data.endDate && data.startDate >= data.endDate) {
      throw new Error('Start date must be before end date');
    }

    // Validate period uniqueness
    await this.validatePeriodUniqueness(roomId, data);

    // Create the new period
    const period = await prisma.mealPeriod.create({
      data: {
        name: data.name,
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

    // Get all current members for notifications
    const currentMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        isCurrent: true,
        isBanned: false,
      },
    });

    // Send notifications to all members
    await Promise.all(
      currentMembers.map((member) =>
        createNotification({
          userId: member.userId,
          type: 'PERIOD_STARTED',
          message: `A new meal period "${data.name}" has started. Period: ${data.startDate.toLocaleDateString()}${data.endDate ? ` - ${data.endDate.toLocaleDateString()}` : ''}`,
        })
      )
    );

    return {
      period,
    };
  }

  /**
   * End the current active period
   */
  static async endPeriod(roomId: string, userId: string, endDate?: Date) {
    // Check if user has admin permissions
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!member || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      throw new Error('Insufficient permissions to end a period');
    }

    // Get the current active period
    const currentPeriod = await this.getCurrentPeriod(roomId);
    if (!currentPeriod) {
      throw new Error('No active period found');
    }

    const actualEndDate = endDate || new Date();

    // Update the period
    const updatedPeriod = await prisma.mealPeriod.update({
      where: { id: currentPeriod.id },
      data: {
        endDate: actualEndDate,
        status: PeriodStatus.ENDED,
      },
    });



    // Send notifications to all members
    const currentMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        isCurrent: true,
        isBanned: false,
      },
    });

    await Promise.all(
      currentMembers.map((member) =>
        createNotification({
          userId: member.userId,
          type: 'PERIOD_ENDED',
          message: `The meal period "${currentPeriod.name}" has ended. Period: ${currentPeriod.startDate.toLocaleDateString()} - ${actualEndDate.toLocaleDateString()}`,
        })
      )
    );

    return updatedPeriod;
  }

  /**
   * Lock a period to prevent further edits
   */
  static async lockPeriod(roomId: string, userId: string, periodId: string) {
    // Check if user has admin permissions
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!member || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      throw new Error('Insufficient permissions to lock a period');
    }

    // Get the period
    const period = await prisma.mealPeriod.findFirst({
      where: {
        id: periodId,
        roomId,
      },
    });

    if (!period) {
      throw new Error('Period not found');
    }

    if (period.isLocked) {
      throw new Error('Period is already locked');
    }

    // Lock the period
    const updatedPeriod = await prisma.mealPeriod.update({
      where: { id: periodId },
      data: {
        isLocked: true,
        status: PeriodStatus.LOCKED,
      },
    });

    // Send notifications to all members
    const currentMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        isCurrent: true,
        isBanned: false,
      },
    });

    await Promise.all(
      currentMembers.map((member) =>
        createNotification({
          userId: member.userId,
          type: 'PERIOD_LOCKED',
          message: `The meal period "${period.name}" has been locked. No further edits are allowed.`,
        })
      )
    );

    return updatedPeriod;
  }

  /**
   * Unlock a period to allow edits
   */
  static async unlockPeriod(roomId: string, userId: string, periodId: string, status: PeriodStatus = PeriodStatus.ENDED) {
    // Check if user has admin permissions
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!member || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      throw new Error('Insufficient permissions to unlock a period');
    }

    // Get the period
    const period = await prisma.mealPeriod.findFirst({
      where: {
        id: periodId,
        roomId,
      },
    });

    if (!period) {
      throw new Error('Period not found');
    }

    if (!period.isLocked) {
      throw new Error('Period is not locked');
    }

    // Unlock the period
    const updatedPeriod = await prisma.mealPeriod.update({
      where: { id: periodId },
      data: {
        isLocked: false,
        status,
      },
    });

    return updatedPeriod;
  }

  /**
   * Get the current active period for a specific group
   */
  static async getCurrentPeriod(roomId: string) {
    if (!roomId) {
      throw new Error('Room ID is required to get current period');
    }

    return await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: PeriodStatus.ACTIVE,
      },
    });
  }

  /**
   * Get all periods for a specific group
   */
  static async getPeriods(roomId: string, includeArchived = false) {
    if (!roomId) {
      throw new Error('Room ID is required to get periods');
    }

    const whereClause: any = { roomId };

    if (!includeArchived) {
      // Optimize query to use 'in' which can use indexes better than 'not'
      whereClause.status = {
        in: [PeriodStatus.ACTIVE, PeriodStatus.ENDED, PeriodStatus.LOCKED],
      };
    }

    return await prisma.mealPeriod.findMany({
      where: whereClause,
      orderBy: {
        startDate: 'desc',
      },
      // Select only necessary fields for list view to reduce payload
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
  static async getPeriod(periodId: string, roomId?: string) {
    if (!periodId) {
      throw new Error('Period ID is required');
    }

    const whereClause: any = { id: periodId };

    // If roomId is provided, ensure the period belongs to that group
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

    // Additional validation: if roomId was provided, ensure it matches
    if (roomId && period.roomId !== roomId) {
      throw new Error('Period does not belong to the specified group');
    }

    return period;
  }

  /**
   * Calculate period summary with all financial and meal data
   * Optimized for performance using database aggregation and parallel execution
   */
  static async calculatePeriodSummary(periodId: string, roomId?: string): Promise<PeriodSummary> {
    // Execute period fetch AND all aggregation queries in parallel
    const [
      period,
      mealsCount,
      guestMealsAgg,
      shoppingAgg,
      paymentsAgg,
      extraExpensesAgg,
      memberCount
    ] = await Promise.all([
      // 1. Fetch period details (lightweight, no relations)
      prisma.mealPeriod.findUnique({
        where: { id: periodId },
      }),

      // 2. Count meals
      prisma.meal.count({
        where: {
          periodId,
          // We can't use period.roomId here because we haven't fetched it yet.
          // However, if roomId IS passed to the function, we should usage it for index optimization.
          ...(roomId && { roomId }),
        },
      }),

      // 3. Sum guest meals count
      prisma.guestMeal.aggregate({
        where: {
          periodId,
          ...(roomId && { roomId }),
        },
        _sum: { count: true },
      }),

      // 4. Sum shopping items
      prisma.shoppingItem.aggregate({
        where: {
          periodId,
          purchased: true,
          ...(roomId && { roomId }),
        },
        _sum: { quantity: true },
      }),

      // 5. Sum completed payments
      prisma.payment.aggregate({
        where: {
          periodId,
          status: 'COMPLETED',
          ...(roomId && { roomId }),
        },
        _sum: { amount: true },
      }),

      // 6. Sum extra expenses
      prisma.extraExpense.aggregate({
        where: {
          periodId,
          ...(roomId && { roomId }),
        },
        _sum: { amount: true },
      }),

      // 7. Count active members (This needs roomId. If not provided, we might need a separate query or accept it's less efficient)
      // If roomId is NOT provided, we technically can't count members efficiently without fetching period first.
      // But typically roomId IS provided in the API call.
      roomId ? prisma.roomMember.count({
        where: {
          roomId: roomId,
          isCurrent: true,
          isBanned: false,
        },
      }) : Promise.resolve(0) // Fallback if no roomId
    ]);

    if (!period) {
      throw new Error('Period not found');
    }

    // Security check: if roomId was provided, verify it matches
    if (roomId && period.roomId !== roomId) {
      throw new Error('Period does not belong to the specified group');
    }

    // If we didn't have roomId initially, we missed the member count. 
    // We could fetch it now, but that defeats the parallel purpose.
    // Ideally, the caller ALWAYS provides roomId.
    let finalMemberCount = memberCount;
    if (!roomId) {
      // Fallback for rare case where roomId wasn't passed
      finalMemberCount = await prisma.roomMember.count({
        where: {
          roomId: period.roomId,
          isCurrent: true,
          isBanned: false
        }
      });
    }

    // Extract values with defaults
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
  static async archivePeriod(roomId: string, userId: string, periodId: string) {
    // Check if user has admin permissions
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!member || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      throw new Error('Insufficient permissions to archive a period');
    }

    // Get the period
    const period = await prisma.mealPeriod.findFirst({
      where: {
        id: periodId,
        roomId,
      },
    });

    if (!period) {
      throw new Error('Period not found');
    }

    if (period.status === PeriodStatus.ACTIVE) {
      throw new Error('Cannot archive an active period');
    }

    // Archive the period
    const updatedPeriod = await prisma.mealPeriod.update({
      where: { id: periodId },
      data: {
        status: PeriodStatus.ARCHIVED,
      },
    });

    return updatedPeriod;
  }

  /**
   * Restart a period (create a new period with the same settings)
   */
  static async restartPeriod(roomId: string, userId: string, periodId: string, newName?: string, withData: boolean = false) {
    try {

      // Check if user has admin permissions
      const member = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      });

      if (!member || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role)) {
        throw new Error('Insufficient permissions to restart a period');
      }

      // Get the original period
      const originalPeriod = await prisma.mealPeriod.findFirst({
        where: {
          id: periodId,
          roomId,
        },
      });

      if (!originalPeriod) {
        throw new Error('Original period not found');
      }

      // Check if there's already an active period
      const existingActivePeriod = await prisma.mealPeriod.findFirst({
        where: {
          roomId,
          status: PeriodStatus.ACTIVE,
        },
      });

      if (existingActivePeriod) {
        throw new Error('Cannot restart period while another period is active. End the current period first.');
      }

      // Generate a unique name for the new period
      let periodName = newName;
      if (!periodName) {
        let baseName = `${originalPeriod.name} (Restarted)`;
        let counter = 1;

        // Check if the name already exists and generate a unique one
        while (true) {
          const existingPeriod = await prisma.mealPeriod.findFirst({
            where: {
              roomId,
              name: baseName,
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

      // Create new period with same settings
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

      // Copy data if requested
      if (withData) {
        await this.copyPeriodData(originalPeriod.id, newPeriod.id);
      }

      // Note: Notification will be handled by the API route

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
  private static async copyPeriodData(fromPeriodId: string, toPeriodId: string) {
    try {
      // Copy meals
      await prisma.meal.updateMany({
        where: { periodId: fromPeriodId },
        data: { periodId: toPeriodId },
      });

      // Copy guest meals
      await prisma.guestMeal.updateMany({
        where: { periodId: fromPeriodId },
        data: { periodId: toPeriodId },
      });

      // Copy shopping items
      await prisma.shoppingItem.updateMany({
        where: { periodId: fromPeriodId },
        data: { periodId: toPeriodId },
      });

      // Copy extra expenses
      await prisma.extraExpense.updateMany({
        where: { periodId: fromPeriodId },
        data: { periodId: toPeriodId },
      });

      // Copy payments
      await prisma.payment.updateMany({
        where: { periodId: fromPeriodId },
        data: { periodId: toPeriodId },
      });

      // Copy market dates
      await prisma.marketDate.updateMany({
        where: { periodId: fromPeriodId },
        data: { periodId: toPeriodId },
      });

      // Copy account transactions
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
  static async getPeriodsByMonth(roomId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return await prisma.mealPeriod.findMany({
      where: {
        roomId,
        OR: [
          {
            startDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            endDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            AND: [
              {
                startDate: {
                  lte: startOfMonth,
                },
              },
              {
                endDate: {
                  gte: endOfMonth,
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
} 