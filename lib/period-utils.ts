import { prisma } from '@/lib/prisma';
import { PeriodStatus } from '@prisma/client';

export interface Period {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: PeriodStatus;
  isLocked: boolean;
  openingBalance: number;
  closingBalance?: number | null;
  carryForward: boolean;
  notes?: string | null;
  roomId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Check if a period is locked and prevents edits
 */
export function isPeriodLocked(period: Period | null): boolean {
  if (!period) return false;
  return period.isLocked || period.status === PeriodStatus.ARCHIVED;
}

/**
 * Check if a date falls within a period's date range
 */
export function isDateInPeriod(date: Date, period: Period | null): boolean {
  if (!period) return false;
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);
  return date >= startDate && date <= endDate;
}

/**
 * Get the current active period for a room
 */
export async function getCurrentPeriod(roomId: string) {
  return await prisma.mealPeriod.findFirst({
    where: {
      roomId,
      status: PeriodStatus.ACTIVE,
    },
  });
}

/**
 * Check if a room has an active period
 */
export async function hasActivePeriod(roomId: string): Promise<boolean> {
  const currentPeriod = await getCurrentPeriod(roomId);
  return !!currentPeriod;
}

/**
 * Validate that a room has an active period
 */
export async function validateActivePeriod(roomId: string) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (!currentPeriod) {
    throw new Error('No active period found. Please start a period first to manage data.');
  }
  return currentPeriod;
}

/**
 * Get period filter for queries
 */
export async function getPeriodFilter(roomId: string) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (!currentPeriod) {
    return null; // No period filter if no active period
  }
  
  return {
    periodId: currentPeriod.id,
  };
}

/**
 * Add period ID to data when creating new records
 */
export async function addPeriodIdToData(roomId: string, data: any) {
  const currentPeriod = await getCurrentPeriod(roomId);
  if (currentPeriod) {
    return {
      ...data,
      periodId: currentPeriod.id,
    };
  }
  return data;
}

/**
 * Get period-aware where clause for queries
 */
export async function getPeriodAwareWhereClause(roomId: string, additionalFilters: any = {}) {
  const currentPeriod = await getCurrentPeriod(roomId);
  
  if (!currentPeriod) {
    // If no active period, return empty result filter
    return {
      ...additionalFilters,
      id: null, // This will return no results
    };
  }
  
  return {
    ...additionalFilters,
    periodId: currentPeriod.id,
  };
}

/**
 * Check if a user can edit meals for a specific date
 */
export function canEditMealsForDate(date: Date, currentPeriod: Period | null): boolean {
  if (!currentPeriod) return false;
  if (isPeriodLocked(currentPeriod)) return false;
  return isDateInPeriod(date, currentPeriod);
}

/**
 * Format period date range for display
 */
export function formatPeriodDateRange(period: Period): string {
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
}

/**
 * Calculate period duration in days
 */
export function getPeriodDuration(period: Period): number {
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get period status display text
 */
export function getPeriodStatusText(period: Period): string {
  if (period.isLocked) return 'Locked';
  
  switch (period.status) {
    case PeriodStatus.ACTIVE:
      return 'Active';
    case PeriodStatus.ENDED:
      return 'Ended';
    case PeriodStatus.ARCHIVED:
      return 'Archived';
    default:
      return period.status;
  }
}

/**
 * Check if a period can be ended
 */
export function canEndPeriod(period: Period): boolean {
  return period.status === PeriodStatus.ACTIVE && !period.isLocked;
}

/**
 * Check if a period can be locked
 */
export function canLockPeriod(period: Period): boolean {
  return period.status === PeriodStatus.ENDED && !period.isLocked;
}

/**
 * Check if a period can be unlocked
 */
export function canUnlockPeriod(period: Period): boolean {
  return period.isLocked;
}

/**
 * Check if a period can be archived
 */
export function canArchivePeriod(period: Period): boolean {
  return period.status === PeriodStatus.ENDED && !period.isLocked;
}

/**
 * Get period status badge variant
 */
export function getPeriodStatusBadgeVariant(period: Period): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (period.isLocked) return 'destructive';
  
  switch (period.status) {
    case PeriodStatus.ACTIVE:
      return 'default';
    case PeriodStatus.ENDED:
      return 'secondary';
    case PeriodStatus.ARCHIVED:
      return 'outline';
    default:
      return 'outline';
  }
} 