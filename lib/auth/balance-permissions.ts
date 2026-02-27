import { Permission, hasPermission } from "./permissions";
import { Role } from "@prisma/client";

/**
 * Check if a user role has privileged access to balance management
 * @param role - The user's role in the group
 * @returns true if the role has privileged access, false otherwise
 */
export function hasBalancePrivilege(role?: Role | null): boolean {
  return hasPermission(role || null, Permission.MANAGE_FINANCE);
}

/**
 * Check if a user can view another user's balance
 * @param viewerRole - The role of the user trying to view the balance
 * @param viewerId - The ID of the user trying to view the balance
 * @param targetUserId - The ID of the user whose balance is being viewed
 * @returns true if the viewer can access the target user's balance
 */
export function canViewUserBalance(
  viewerRole: Role | null | undefined,
  viewerId: string,
  targetUserId: string
): boolean {
  // Users can always view their own balance
  if (viewerId === targetUserId) {
    return true;
  }
  
  // Use permission check
  return hasPermission(viewerRole || null, Permission.VIEW_FINANCE);
}

/**
 * Check if a user can modify transactions (add/edit)
 * @param role - The user's role in the group
 * @returns true if the user can modify transactions
 */
export function canModifyTransactions(role?: Role | null): boolean {
  return hasPermission(role || null, Permission.MANAGE_FINANCE);
}

/**
 * Check if a user can delete transactions
 * @param role - The user's role in the group
 * @returns true if the user can delete transactions
 */
export function canDeleteTransactions(role?: Role | null): boolean {
  // Use MANAGE_FINANCE for deletion as well, or MANAGE_SETTINGS if strictly ADMIN
  return hasPermission(role || null, Permission.MANAGE_FINANCE);
}
