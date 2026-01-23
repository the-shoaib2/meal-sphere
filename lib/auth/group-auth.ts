import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "@/lib/services/prisma";
import { Role } from "@prisma/client";
import { Permission, hasPermission } from "./permissions";

export { Permission };

export interface GroupAuthResult {
  isAuthenticated: boolean;
  isMember: boolean;
  userRole: Role | null;
  canAccess: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  groupId: string;
  userId: string | null;
  permissions?: any; // Custom permissions JSON
  features?: Record<string, boolean>; // Group features
  error?: string;
}

export interface GroupPermissionResult extends GroupAuthResult {
  hasPermission: boolean;
  requiredRole?: Role;
}

/**
 * Check if user is authenticated and has access to a specific group
 */
export async function checkGroupAccess(groupId: string): Promise<GroupAuthResult> {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        isAuthenticated: false,
        isMember: false,
        userRole: null,
        canAccess: false,
        isAdmin: false,
        isCreator: false,
        groupId,
        userId: null,
        error: "Not authenticated"
      };
    }

    const userId = session.user.id;

    // Check if group exists
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId },
          select: {
            role: true,
            isBanned: true,
            permissions: true // FETCH PERMISSIONS
          }
        },
        createdByUser: {
          select: { id: true }
        }
      }
    });

    if (!group) {
      return {
        isAuthenticated: true,
        isMember: false,
        userRole: null,
        canAccess: false,
        isAdmin: false,
        isCreator: false,
        groupId,
        userId,
        error: "Group not found"
      };
    }

    // Check if user is banned
    const member = group.members[0];

    if (member?.isBanned) {
      return {
        isAuthenticated: true,
        isMember: true,
        userRole: member.role,
        canAccess: false,
        isAdmin: false,
        isCreator: false,
        groupId,
        userId,
        error: "You are banned from this group"
      };
    }

    // Check if user is a member
    const isMember = member !== undefined;
    const userRole = member?.role || null;
    const isCreator = group.createdByUser.id === userId;

    // Determine admin status (only ADMIN role)
    const isAdmin = isMember && userRole === Role.ADMIN;

    // Determine access based on group privacy
    let canAccess = false;
    if (group.isPrivate) {
      // Private groups: only members can access
      canAccess = isMember;
    } else {
      // Public groups: everyone can view, but only members can interact
      canAccess = true;
    }

    return {
      isAuthenticated: true,
      isMember,
      userRole,
      canAccess,
      isAdmin,
      isCreator,
      groupId,
      userId,
      permissions: member?.permissions,
      features: group.features as Record<string, boolean>,
      error: canAccess ? undefined : "Not a member of this group"
    };

  } catch (error) {
    console.error("Error checking group access:", error);
    return {
      isAuthenticated: false,
      isMember: false,
      userRole: null,
      canAccess: false,
      isAdmin: false,
      isCreator: false,
      groupId,
      userId: null,
      error: "Internal server error"
    };
  }
}

/**
 * Check if user has specific role-based permissions
 */
export async function checkGroupPermission(
  groupId: string,
  requiredRoles: Role[] = [Role.ADMIN]
): Promise<GroupPermissionResult> {
  const authResult = await checkGroupAccess(groupId);

  if (!authResult.canAccess) {
    return {
      ...authResult,
      hasPermission: false,
    };
  }

  // Use the new centralized permission checker
  // We determine what "Permission" corresponds to the requested "Roles".
  // This is a bridge for legacy calls. If 'requiredRoles' contains ADMIN, we check generic management.
  // Ideally, callers should use checkActionPermission directly, but for backward compat:

  let allowed = false;

  // If no specific roles requested, check if just access is enough (which is true if here)
  if (!requiredRoles || requiredRoles.length === 0) {
    allowed = true;
  } else {
    // Default check: does user role match one of the required roles?
    // This keeps backward compatibility with existing code
    if (authResult.userRole && requiredRoles.includes(authResult.userRole)) {
      allowed = true;
    }
  }

  return {
    ...authResult,
    hasPermission: allowed,
    requiredRole: requiredRoles[0]
  };
}

/**
 * Check if user has a specific granular permission
 */
export async function checkActionPermission(
  groupId: string,
  action: Permission
): Promise<GroupPermissionResult> {
  const authResult = await checkGroupAccess(groupId);

  // Member permissions also come from the DB fetch in checkGroupAccess
  // But currently checkGroupAccess doesn't fetch the `permissions` JSON column.
  // Optimally, we should fetch it there. For now, we rely on the role default + global override.

  // However, to support CUSTOM roles fully, we need that JSON.
  // Let's rely on hasPermission helper which does the logic.
  // Since we don't have the custom permissions loaded in authResult yet, we might miss them.
  // For this refactor, let's assume standard role behavior + SUPER_ADMIN override is the priority.

  // We can fetch custom permissions here if needed or update checkGroupAccess to select them.
  // Let's update checkGroupAccess to select them in a follow-up if needed, 
  // but looking at checkGroupAccess code:
  // select: { role: true, isBanned: true } -> It bypasses 'permissions'.

  // Ideally, we should update checkGroupAccess to fetch permissions too.

  const hasPerm = hasPermission(authResult.userRole, action, authResult.permissions);

  return {
    ...authResult,
    hasPermission: hasPerm
  };
}

/**
 * Middleware function to validate group access and return appropriate response
 */
export async function validateGroupAccess(groupId: string) {
  const authResult = await checkGroupAccess(groupId);

  if (!authResult.isAuthenticated) {
    return {
      success: false,
      error: "Authentication required",
      status: 401
    };
  }

  if (!authResult.canAccess) {
    return {
      success: false,
      error: authResult.error || "Access denied",
      status: 403
    };
  }

  return {
    success: true,
    authResult,
    group: authResult // For convenience, though authResult now has features
  };
}

/**
 * Middleware function to validate admin permissions
 * SECURITY FIX: Now properly checks membership and ban status
 */
export async function validateAdminAccess(groupId: string) {
  const authResult = await checkGroupPermission(groupId, [Role.ADMIN]);

  if (!authResult.isAuthenticated) {
    return {
      success: false,
      error: "Authentication required",
      status: 401
    };
  }

  // CRITICAL FIX: Verify user is actually a member
  if (!authResult.isMember) {
    return {
      success: false,
      error: "Not a member of this group",
      status: 403
    };
  }

  // CRITICAL FIX: Verify user is not banned and has a role
  if (authResult.userRole === null) {
    return {
      success: false,
      error: "No role assigned in this group",
      status: 403
    };
  }

  // Check admin permission
  if (!authResult.hasPermission) {
    return {
      success: false,
      error: "Admin access required",
      status: 403
    };
  }

  return {
    success: true,
    authResult
  };
}

/**
 * Get group data with proper access control
 * Combines auth check and data fetch into a single query for better performance
 */
export async function getGroupData(groupId: string, userId: string) {
  try {
    if (!userId) return null;

    // Execute all queries in parallel for maximum performance independent of access
    // We filter sensitive data in memory if access is denied later
    const [accessCheck, groupDetails, memberList] = await Promise.all([
      // 1. Access Check: Get specific membership info for current user
      prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: userId,
            roomId: groupId
          }
        },
        select: { role: true, isBanned: true }
      }),

      // 2. Room Metadata (without messages for performance)
      // Messages should be fetched separately via /api/groups/[id]/messages
      prisma.room.findUnique({
        where: { id: groupId },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true, image: true }
          },
          _count: {
            select: { members: true }
          }
        }
      }),

      // 3. Member Display List (Top 20 for performance)
      // Full member list should be fetched via separate endpoint if needed
      prisma.roomMember.findMany({
        where: { roomId: groupId },
        orderBy: { joinedAt: 'asc' },
        take: 20,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      }
      )
    ]);

    if (!groupDetails) return null;

    // --- Access Control Logic ---
    const isMember = !!accessCheck;
    const isCreator = groupDetails.createdByUser.id === userId;
    const isBanned = accessCheck?.isBanned || false;

    if (isBanned) return null;
    if (groupDetails.isPrivate && !isMember) return null;

    // Return combined data
    return {
      ...groupDetails,
      members: memberList, // Use the parallel fetched list
      totalMemberCount: groupDetails._count.members,

      // Auth metadata
      userRole: accessCheck?.role || null,
      isMember,
      isAdmin: accessCheck?.role === Role.ADMIN,
      isCreator,
      canAccess: true,

      // Messages should be fetched separately for performance
      messages: [],
      joinRequests: [], // Always empty here, fetched via separate API
    };

  } catch (error) {
    console.error("Error fetching group data:", error);
    return null;
  }
}

/**
 * Check if user can perform specific actions
 */
export async function canPerformAction(
  groupId: string,
  action: 'view' | 'edit' | 'delete' | 'manage_members' | 'manage_settings' | 'send_messages'
): Promise<boolean> {
  const authResult = await checkGroupAccess(groupId);

  if (!authResult.canAccess) {
    return false;
  }

  // Map legacy string actions to strict Permissions
  // This allows SUPER_ADMIN override via hasPermission
  let permission: Permission;

  switch (action) {
    case 'view': permission = Permission.VIEW_GROUP; break;
    case 'edit': permission = Permission.EDIT_GROUP; break;
    case 'delete': permission = Permission.DELETE_GROUP; break;
    case 'manage_members': permission = Permission.MANAGE_MEMBERS; break;
    case 'manage_settings': permission = Permission.MANAGE_SETTINGS; break;
    case 'send_messages': permission = Permission.SEND_MESSAGES; break;
    default: return false;
  }

  return hasPermission(
    authResult.userRole,
    permission,
    authResult.permissions
  );
} 