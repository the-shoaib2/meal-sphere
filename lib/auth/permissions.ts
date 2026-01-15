
import { Role, GroupRole } from "@prisma/client";

// Define all possible actions in the system
export enum Permission {
  VIEW_GROUP = "view_group",
  EDIT_GROUP = "edit_group",
  DELETE_GROUP = "delete_group",
  MANAGE_MEMBERS = "manage_members",
  MANAGE_SETTINGS = "manage_settings",
  SEND_MESSAGES = "send_messages",
  MANAGE_MEALS = "manage_meals",
  MANAGE_FINANCE = "manage_finance",
  MANAGE_MARKET = "manage_market",
  VIEW_FINANCE = "view_finance",
}

// Default permissions for each GROUP role
export const ROLE_PERMISSIONS: Record<GroupRole, Permission[]> = {
  ADMIN: Object.values(Permission), // Group Admin has full control of group
  MODERATOR: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MEMBERS,
    Permission.MANAGE_MEALS,
    Permission.VIEW_FINANCE,
  ],
  MANAGER: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MEALS,
    Permission.MANAGE_MARKET,
    Permission.VIEW_FINANCE,
  ],
  LEADER: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MEMBERS,
    Permission.VIEW_FINANCE,
  ],
  MEAL_MANAGER: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MEALS,
    Permission.VIEW_FINANCE,
  ],
  ACCOUNTANT: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_FINANCE,
    Permission.VIEW_FINANCE,
  ],
  MARKET_MANAGER: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MARKET,
    Permission.VIEW_FINANCE,
  ],
  MEMBER: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.VIEW_FINANCE, // Usually members can see stats
  ],
  BANNED: [],
};

/**
 * Checks if a user has permission to perform an action.
 * 
 * @param globalRole The user's global system role (e.g. SUPER_ADMIN, USER)
 * @param groupRole The user's role within the specific group
 * @param action The action to perform
 * @param customPermissions Optional JSON from RoomMember.permissions to override defaults
 */
export function hasPermission(
  globalRole: string | null | undefined,
  groupRole: GroupRole | null,
  action: Permission,
  customPermissions?: any
): boolean {
  // 1. GLOBAL OVERRIDE: SUPER_ADMIN can do anything anywhere
  if (globalRole === "SUPER_ADMIN") {
    return true;
  }

  // 2. BANNED check
  if (groupRole === "BANNED" || globalRole === "BANNED") {
    return false;
  }

  // 3. Custom Permission Override (if implemented)
  // Logic: If customPermissions exists and explicitly allows/denies, use it.
  if (customPermissions && typeof customPermissions === 'object') {
    if (customPermissions[action] === true) return true;
    if (customPermissions[action] === false) return false;
  }

  // 4. Group Role Default Permissions
  if (!groupRole) return false;

  const permissions = ROLE_PERMISSIONS[groupRole];
  return permissions ? permissions.includes(action) : false;
}
