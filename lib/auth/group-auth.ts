import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export interface GroupAuthResult {
  isAuthenticated: boolean;
  isMember: boolean;
  userRole: Role | null;
  canAccess: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  groupId: string;
  userId: string | null;
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
            isBanned: true
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
      requiredRole: requiredRoles[0]
    };
  }

  const hasPermission = authResult.isAdmin ||
    (authResult.userRole && requiredRoles.includes(authResult.userRole));

  return {
    ...authResult,
    hasPermission: !!hasPermission,
    requiredRole: requiredRoles[0]
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
    authResult
  };
}

/**
 * Middleware function to validate admin permissions
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

      // 2. Room Metadata & Messages
      // We optimistically fetch messages (limit 50) to avoid a second round trip
      // We will discard them if the user turns out not to be a member
      prisma.room.findUnique({
        where: { id: groupId },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true, image: true }
          },
          _count: {
            select: { members: true }
          },
          // Always fetch messages, we'll strip them later if needed
          messages: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      }),

      // 3. Member Display List (Top 100)
      prisma.roomMember.findMany({
        where: { roomId: groupId },
        orderBy: { joinedAt: 'asc' },
        take: 100,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      })
    ]);

    if (!groupDetails) return null;

    // --- Access Control Logic ---
    const isMember = !!accessCheck;
    const isCreator = groupDetails.createdByUser.id === userId;
    const isBanned = accessCheck?.isBanned || false;

    if (isBanned) return null;
    if (groupDetails.isPrivate && !isMember) return null;

    // Filter sensitive data for non-members (public groups)
    const secureMessages = isMember ? groupDetails.messages : [];

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

      // Sanitized data
      messages: secureMessages,
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

  switch (action) {
    case 'view':
      return authResult.canAccess;

    case 'edit':
    case 'delete':
      return authResult.isAdmin;

    case 'manage_members':
    case 'manage_settings':
      return authResult.isAdmin;

    case 'send_messages':
      return authResult.isMember;

    default:
      return false;
  }
} 