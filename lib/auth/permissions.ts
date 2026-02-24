
import { Role } from "@prisma/client";

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
  MANAGE_JOIN_REQUESTS = "manage_join_requests",
  CREATE_INVITES = "create_invites",
  VIEW_ACTIVITY_LOGS = "view_activity_logs",
}

// Default permissions for each GROUP role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: Object.values(Permission), // Group Admin has full control of group
  MODERATOR: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MEMBERS,
    Permission.MANAGE_MEALS,
    Permission.VIEW_FINANCE,
    Permission.MANAGE_JOIN_REQUESTS,
    Permission.CREATE_INVITES,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
  MANAGER: [
    Permission.VIEW_GROUP,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_MEALS,
    Permission.MANAGE_MARKET,
    Permission.VIEW_FINANCE,
    Permission.CREATE_INVITES,
    Permission.VIEW_ACTIVITY_LOGS,
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
 * @param groupRole The user's role within the specific group
 * @param action The action to perform
 * @param customPermissions Optional JSON from RoomMember.permissions to override defaults
 */
export function hasPermission(
  groupRole: Role | null,
  action: Permission,
  customPermissions?: any
): boolean {
  // 1. BANNED check
  if (groupRole === "BANNED") {
    return false;
  }

  // 2. Custom Permission Override (if implemented)
  // Logic: If customPermissions exists and explicitly allows/denies, use it.
  if (customPermissions && typeof customPermissions === 'object') {
    if (customPermissions[action] === true) return true;
    if (customPermissions[action] === false) return false;
  }

  // 3. Group Role Default Permissions
  if (!groupRole) return false;

  const permissions = ROLE_PERMISSIONS[groupRole];
  return permissions ? permissions.includes(action) : false;
}
