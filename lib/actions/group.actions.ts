"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { z } from "zod";
import { createGroup, updateGroup, deleteGroup, joinGroup, leaveGroup, updatePeriodMode, createJoinRequest, setCurrentGroup, removeMemberFromGroup, updateMemberRole, generateGroupInvite, sendGroupInvitations, fetchGroupActivityLogs, processJoinRequest } from "@/lib/services/groups-service";
import { prisma } from "@/lib/services/prisma";
import { unstable_cache } from "next/cache";
import { validateAdminAccess, validateGroupAccess } from "@/lib/auth/group-auth";

const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().positive().max(100).optional(),
  bannerUrl: z.string().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
  maxMembers: z.number().min(1).optional(),
  bannerUrl: z.string().nullable().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  features: z.record(z.string(), z.boolean()).optional()
});

export async function createGroupAction(data: z.infer<typeof createGroupSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const validation = createGroupSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: "Invalid input data" };
    }

    const { name, description, isPrivate, maxMembers, bannerUrl } = validation.data;

    const group = await createGroup({
      name,
      description,
      isPrivate,
      maxMembers,
      bannerUrl,
      userId: session.user.id
    });
    
    return { success: true, group };
  } catch (error: any) {
    console.error("Error in group creation:", error);
    return { success: false, message: error.message || "Failed to create group" };
  }
}

export async function updateGroupAction(id: string, data: z.infer<typeof updateGroupSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return { success: false, message: "Authentication required" };
    }

    const validationData = updateGroupSchema.safeParse(data);
    if (!validationData.success) {
        return { success: false, message: "Invalid request data" };
    }

    // Validate admin access
    const validation = await validateAdminAccess(id);
    if (!validation.success) {
      return { success: false, message: validation.error || "Forbidden" };
    }

    const updatedGroup = await updateGroup(id, validationData.data);

    return { success: true, group: updatedGroup };
  } catch (error: any) {
    console.error("Error updating group:", error);
    return { success: false, message: error.message || "Internal Server Error" };
  }
}

export async function deleteGroupAction(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return { success: false, message: "Authentication required" };
    }

    await deleteGroup(id, session.user.id);

    return { success: true, message: "Group deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting group:", error);
    if (error.message && error.message.includes('Only the group creator')) {
        return { success: false, message: error.message };
    }
    return { success: false, message: "Internal Server Error" };
  }
}

export async function joinGroupAction(data: { groupId?: string; token?: string; password?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    if (!data.groupId && !data.token) {
      return { success: false, message: "Either groupId or token is required" };
    }

    let targetGroupId = data.groupId;

    // If only token is provided, we need to resolve it to find the groupId first
    // This handles the case where the frontend only has the invite code
    if (data.token && !targetGroupId) {
      const invite = await prisma.inviteToken.findUnique({
        where: { token: data.token }
      });
      if (!invite) {
        return { success: false, message: "Invalid or expired invite token" };
      }
      targetGroupId = invite.roomId;
    }

    if (!targetGroupId) {
       return { success: false, message: "Could not resolve group ID" };
    }

    const result = await joinGroup(targetGroupId, session.user.id, data.password, data.token);

    return { success: true, requestCreated: result.requestCreated, membership: result.membership };
  } catch (error: any) {
    console.error("Error joining group:", error);
    return { success: false, message: error.message || "Failed to join group" };
  }
}

export async function leaveGroupAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    await leaveGroup(groupId, session.user.id);
    return { success: true, message: "Left group successfully" };
  } catch (error: any) {
    console.error("Error leaving group:", error);
    if (error.message && error.message.includes("CREATOR_CANNOT_LEAVE")) {
       return { success: false, message: "CREATOR_CANNOT_LEAVE" };
    }
    return { success: false, message: error.message || "Failed to leave group" };
  }
}

const updatePeriodModeSchema = z.object({
  mode: z.enum(["MONTHLY", "CUSTOM"]),
});

export async function updatePeriodModeAction(groupId: string, data: { mode: "MONTHLY" | "CUSTOM" }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const validationData = updatePeriodModeSchema.safeParse(data);
    if (!validationData.success) {
      return { success: false, message: "Invalid data" };
    }

    const validation = await validateAdminAccess(groupId);
    if (!validation.success) {
      return { success: false, message: validation.error || "Forbidden" };
    }

    const updatedGroup = await updatePeriodMode(groupId, validationData.data.mode, session.user.id);    return { success: true, periodMode: updatedGroup.periodMode };
  } catch (error: any) {
    console.error("Error updating period mode:", error);
    return { success: false, message: error.message || "Failed to update period mode" };
  }
}

export async function handleJoinRequestAction(groupId: string, requestId: string, action: "approve" | "reject") {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const validation = await validateAdminAccess(groupId);
    if (!validation.success) {
      return { success: false, message: validation.error || "Forbidden" };
    }

    const joinReq = await prisma.joinRequest.findUnique({
      where: { id: requestId }
    });

    if (!joinReq || joinReq.roomId !== groupId) {
       return { success: false, message: "Request not found" };
    }

    if (action === 'approve') {
       // Create member
       await prisma.roomMember.create({
         data: {
           userId: joinReq.userId,
           roomId: groupId,
           role: 'MEMBER'
         }
       });
       // increment count
       await prisma.room.update({
         where: { id: groupId },
         data: { memberCount: { increment: 1 } }
       });
       
       await prisma.joinRequest.update({
         where: { id: requestId },
         data: { status: 'APPROVED' }
       });

       // Trigger Notification
       await prisma.notification.create({
           data: {
               userId: joinReq.userId,
               type: 'GENERAL',
               message: `Your request to join the group has been approved.`
           }
       });
    } else {
       await prisma.joinRequest.update({
         where: { id: requestId },
         data: { status: 'REJECTED' }
       });
    }

    return { success: true, message: `Request ${action}d successfully` };
  } catch (error: any) {
    console.error("Error handling join request:", error);
    return { success: false, message: error.message || "Failed to handle request" };
  }
}

export async function createJoinRequestAction(groupId: string, data: { message?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const request = await createJoinRequest(groupId, session.user.id, data.message);
    
    return { success: true, joinRequest: request };
  } catch (error: any) {
    console.error("Error creating join request:", error);
    return { success: false, message: error.message || "Failed to create join request" };
  }
}

export async function getJoinRequestStatusAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const joinRequest = await prisma.joinRequest.findFirst({
      where: {
        roomId: groupId,
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, joinRequest };
  } catch (error: any) {
    console.error("Error fetching join request:", error);
    return { success: false, message: "Failed to fetch join request" };
  }
}

export async function cancelJoinRequestAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const existingRequest = await prisma.joinRequest.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId
        }
      }
    });

    if (!existingRequest) {
      return { success: false, message: "Join request not found" };
    }

    if (existingRequest.status === 'APPROVED') {
       return { success: false, message: "Cannot cancel an approved request. Please leave the group instead." };
    }

    await prisma.joinRequest.delete({
      where: { id: existingRequest.id }
    });

    return { success: true, message: "Join request cancelled successfully" };
  } catch (error: any) {
    console.error("Error cancelling join request:", error);
    return { success: false, message: "Failed to cancel join request" };
  }
}

export async function setCurrentGroupAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    if (!groupId) {
      return { success: false, message: "Group ID is required" };
    }

    // Verify user is a member of the group
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: groupId,
        },
      },
    });

    if (!membership) {
      return { success: false, message: "You are not a member of this group" };
    }

    // Efficiently switch groups using service
    await setCurrentGroup(groupId, session.user.id);

    return { success: true };
  } catch (error: any) {
    console.error("Error setting current group:", error);
    return { success: false, message: "Failed to set current group" };
  }
}

export async function removeMemberAction(groupId: string, targetMemberId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    await removeMemberFromGroup(groupId, session.user.id, targetMemberId);
    return { success: true, message: "Member removed successfully" };
  } catch (error: any) {
    console.error("Error removing member:", error);
    return { success: false, message: error.message || "Failed to remove member" };
  }
}

export async function updateMemberRoleAction(groupId: string, targetMemberId: string, newRole: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    await updateMemberRole(groupId, session.user.id, targetMemberId, newRole);
    return { success: true, message: "Role updated successfully" };
  } catch (error: any) {
    console.error("Error updating member role:", error);
    return { success: false, message: error.message || "Failed to update role" };
  }
}

export async function generateGroupInviteAction(groupId: string, role: string, expiresInDays: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const inviteLink = await generateGroupInvite(groupId, session.user.id, role, expiresInDays);
    return { success: true, inviteLink };
  } catch (error: any) {
    console.error("Error generating invite link:", error);
    return { success: false, message: error.message || "Failed to generate invite link" };
  }
}

export async function sendGroupInvitationsAction(groupId: string, emails: string[], role: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const result = await sendGroupInvitations(groupId, session.user.id, emails, role);
    return result;
  } catch (error: any) {
    console.error("Error sending invitations:", error);
    return { success: false, message: error.message || "Failed to send invitations" };
  }
}

// Module-level cache to ensure consistency across requests
const getCachedStats = unstable_cache(
  async (id: string) => {
    const [mealCount, shoppingCount, paymentCount, expenseCount, memberCount] = await Promise.all([
      prisma.meal.count({ where: { roomId: id } }),
      prisma.shoppingItem.count({ where: { roomId: id } }),
      prisma.payment.count({ where: { roomId: id } }),
      prisma.extraExpense.count({ where: { roomId: id } }),
      prisma.roomMember.count({ where: { roomId: id } }),
    ]);

    return {
      meals: mealCount,
      shopping: shoppingCount,
      payments: paymentCount,
      expenses: expenseCount,
      members: memberCount,
    };
  },
  ['v2-group-stats'],
  { revalidate: 60 } // Stats don't need to be real-time to the second
);

export async function getGroupStatsAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const access = await validateGroupAccess(groupId);
    if (!access.success) return { success: false, message: access.error };

    const stats = await getCachedStats(groupId);
    
    return { success: true, stats };
  } catch (error: any) {
    console.error("Error fetching group stats:", error);
    return { success: false, message: error.message || "Failed to fetch stats" };
  }
}

export async function getGroupActivityAction(groupId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, message: "Authentication required" };

    const access = await validateGroupAccess(groupId);
    if (!access.success) return { success: false, message: access.error };

    const logs = await fetchGroupActivityLogs(groupId, session.user.id);

    return { success: true, logs };
  } catch (error: any) {
    console.error("Error fetching activity:", error);
    return { success: false, message: error.message || "Failed to fetch activity" };
  }
}

export async function processJoinRequestAction(requestId: string, action: 'approve' | 'reject') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }

    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) return { success: false, message: "Request not found" };

    const access = await validateAdminAccess(request.roomId);
    if (!access.success) return { success: false, message: access.error };

    const result = await processJoinRequest(requestId, action);
    return { success: true, message: "Request processed successfully", result };
  } catch (error: any) {
    console.error("Error processing request:", error);
    return { success: false, message: error.message || "Failed to process request" };
  }
}

