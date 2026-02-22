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
  return period.isLocked || period.status === PeriodStatus.ARCHIVED || period.status === PeriodStatus.LOCKED;
}

/**
 * Check if a user can edit meals for a specific date and type
 * This is the single source of truth for meal modification permissions.
 */
export function canUserEditMeal(
  date: Date,
  type: 'BREAKFAST' | 'LUNCH' | 'DINNER',
  userRole: string | null,
  mealSettings: any | null,
  currentPeriod: any | null
): boolean {
  // 1. Period check: No edits allowed in locked/archived periods
  if (isPeriodLocked(currentPeriod)) return false;

  // 2. Privileged Bypass: Admins, Managers, and Meal Managers skip all other restrictions
  const isPrivileged = userRole && ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(userRole);
  if (isPrivileged) return true;

  const now = new Date();
  const targetDate = new Date(date);
  
  // Standardize both to start of day for comparison
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const isToday = d1.getTime() === d2.getTime();
  const isPast = d2 < d1;

  // 3. Past Date Restriction: Regular members cannot edit past meals
  if (isPast) return false;

  // 4. Today Cutoff Restriction: For today, check meal-specific cutoff times
  if (isToday) {
    if (!mealSettings) return true;

    let mealTimeStr = '';
    if (type === 'BREAKFAST') mealTimeStr = mealSettings.breakfastTime || '08:00';
    if (type === 'LUNCH') mealTimeStr = mealSettings.lunchTime || '13:00';
    if (type === 'DINNER') mealTimeStr = mealSettings.dinnerTime || '20:00';

    const [hours, minutes] = mealTimeStr.split(':').map(Number);
    const mealTime = new Date(d2);
    mealTime.setHours(hours, minutes, 0, 0);

    if (now >= mealTime) {
      return false;
    }
  }

  // 5. Future dates are allowed for regular members
  return true;
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

/**
 * Formats a date to YYYY-MM-DD in a timezone-agnostic way (UTC midnight)
 */
export function formatDateSafe(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a UTC midnight Date object
 * to prevent local timezone shifts from drifting the day.
 */
export function parseDateSafe(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Using Date.UTC and then a new Date(UTC_TIMESTAMP) ensures it's treated as UTC midnight
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

