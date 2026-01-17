/**
 * Centralized Account Balance Permission Configuration
 * 
 * This file defines the roles and permissions for the account balance system.
 * All balance-related API endpoints and components should import from this file
 * to ensure consistent permission checks across the application.
 */

/**
 * Roles that have full access to account balance management:
 * - View all group member balances
 * - Add/edit/delete transactions for any user
 * - View transaction history for any user
 */
export const BALANCE_PRIVILEGED_ROLES = [
  'ADMIN',
  'ACCOUNTANT',
] as const;

/**
 * Check if a user role has privileged access to balance management
 * @param role - The user's role in the group
 * @returns true if the role has privileged access, false otherwise
 */
export function hasBalancePrivilege(role?: string | null): boolean {
  return !!role && BALANCE_PRIVILEGED_ROLES.includes(role as any);
}

/**
 * Check if a user can view another user's balance
 * @param viewerRole - The role of the user trying to view the balance
 * @param viewerId - The ID of the user trying to view the balance
 * @param targetUserId - The ID of the user whose balance is being viewed
 * @returns true if the viewer can access the target user's balance
 */
export function canViewUserBalance(
  viewerRole: string | null | undefined,
  viewerId: string,
  targetUserId: string
): boolean {
  // Users can always view their own balance
  if (viewerId === targetUserId) {
    return true;
  }
  
  // Privileged users can view any user's balance
  return hasBalancePrivilege(viewerRole);
}

/**
 * Check if a user can modify transactions (add/edit)
 * @param role - The user's role in the group
 * @returns true if the user can modify transactions
 */
export function canModifyTransactions(role?: string | null): boolean {
  return hasBalancePrivilege(role);
}

/**
 * Check if a user can delete transactions (ADMIN only)
 * @param role - The user's role in the group
 * @returns true if the user can delete transactions
 */
export function canDeleteTransactions(role?: string | null): boolean {
  return role === 'ADMIN';
}
