import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { prisma } from "@/lib/prisma"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param id The string to validate
 * @returns boolean indicating if the string is a valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function assertOnline() {
  if (typeof window !== 'undefined' && (window as any).__APP_OFFLINE) {
    throw new Error('No internet connection');
  }
}

/**
 * Gets the current group ID for a user
 * @param userId The user ID
 * @returns The current group ID or null if not found
 */
export async function getCurrentGroupId(userId: string): Promise<string | null> {
  try {
    const currentGroup = await prisma.roomMember.findFirst({
      where: { 
        userId,
        isCurrent: true 
      },
      select: {
        roomId: true
      }
    });

    return currentGroup?.roomId || null;
  } catch (error) {
    console.error('Error getting current group ID:', error);
    return null;
  }
}
