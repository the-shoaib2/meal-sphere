import { prisma } from '@/lib/services/prisma';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { cacheDelete } from '@/lib/cache/cache-service';
import { Role } from '@prisma/client';
import { sendGroupInviteEmail } from './email-utils';

export async function fetchGroupsData(userId: string) {
  const cacheKey = `groups-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Parallel queries for all group-related data
      const [
        myGroupsRaw,
        publicGroupsRaw,
        joinRequestsRaw
      ] = await Promise.all([
        // User's groups with member info and isCurrent flag
        prisma.room.findMany({
          where: {
            members: {
              some: {
                userId: userId
              }
            }
          },
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            memberCount: true,
            maxMembers: true,
            createdAt: true,
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            members: {
              select: {
                id: true,
                role: true,
                joinedAt: true,
                userId: true,
                isCurrent: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                  }
                }
              },
              orderBy: {
                joinedAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        
        // Public groups (for discovery)
        prisma.room.findMany({
          where: {
            isPrivate: false,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            memberCount: true,
            maxMembers: true,
            createdAt: true,
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            members: {
              select: {
                id: true,
                role: true,
                joinedAt: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                  }
                }
              },
              take: 5
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20
        }),
        
        // User's pending join requests
        prisma.joinRequest.findMany({
          where: {
            userId: userId,
            status: 'PENDING'
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            room: {
              select: {
                id: true,
                name: true,
                description: true,
                isPrivate: true
              }
            }
          }
        })
      ]);

      // Find the active group (where isCurrent = true for this user)
      const activeGroup = myGroupsRaw.find(group => 
        group.members.some(member => member.userId === userId && member.isCurrent)
      );

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        myGroups: myGroupsRaw,
        publicGroups: publicGroupsRaw,
        joinRequests: joinRequestsRaw,
        activeGroup: activeGroup || null,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'groups-data'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, 'groups'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

export async function fetchGroupDetails(groupId: string, userId: string) {
  const cacheKey = `group-details-${groupId}-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const group = await prisma.room.findUnique({
        where: { id: groupId },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            },
            orderBy: {
              joinedAt: 'asc'
            }
          }
        }
      });

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        group,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'v1-group-details'],
    { 
      revalidate: 30, 
      tags: [`group-${groupId}`, `user-${userId}`] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
export async function fetchGroupAccessData(groupId: string, userId: string) {
  const cacheKey = `group-access-${groupId}-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Execute both queries in parallel
      const [group, membership] = await Promise.all([
        prisma.room.findUnique({
          where: { id: groupId },
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            memberCount: true,
            bannerUrl: true,
            category: true,
            createdBy: true
          }
        }),
        prisma.roomMember.findUnique({
          where: {
            userId_roomId: {
              userId: userId,
              roomId: groupId
            }
          },
          select: {
            role: true,
            isBanned: true,
            permissions: true
          }
        })
      ]);

      if (!group) {
        return encryptData({
          isMember: false,
          userRole: null,
          permissions: [],
          canAccess: false,
          isAdmin: false,
          isCreator: false,
          groupId,
          group: null,
          error: "Group not found",
          timestamp: new Date().toISOString(),
          executionTime: performance.now() - start
        });
      }

      const isMember = !!membership && !membership.isBanned;
      const userRole = membership?.role || null;
      const isCreator = group.createdBy === userId;
      const isAdmin = userRole === 'ADMIN';

      // Determine access legacy logic
      let canAccess = !group.isPrivate || isMember;

      // Import Role and ROLE_PERMISSIONS internally to avoid top-level dependency issues if any
      // but they are already imported or available via prisma
      const { ROLE_PERMISSIONS } = await import('@/lib/auth/permissions');
      const permissions = userRole ? (ROLE_PERMISSIONS[userRole] || []) : [];

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        isMember,
        userRole,
        permissions,
        canAccess,
        isAdmin,
        isCreator,
        groupId,
        group,
        error: canAccess ? null : "Not a member of this private group",
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'group-access'],
    { 
      revalidate: 60, 
      tags: [`group-${groupId}`, `user-${userId}`, 'access'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

export async function fetchGroupJoinDetails(groupId: string, userId: string) {
  const cacheKey = `group-join-${groupId}-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const [group, membership, joinRequest] = await Promise.all([
        prisma.room.findUnique({
          where: { id: groupId },
          select: {
            id: true,
            name: true,
            description: true,
            isPrivate: true,
            memberCount: true,
            maxMembers: true,
            createdAt: true,
            fineEnabled: true,
            fineAmount: true,
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }),
        prisma.roomMember.findUnique({
          where: {
            userId_roomId: {
              userId: userId,
              roomId: groupId
            }
          },
          select: {
            role: true,
            isBanned: true
          }
        }),
        prisma.joinRequest.findFirst({
          where: {
            userId: userId,
            roomId: groupId,
            status: {
              in: ['PENDING', 'APPROVED', 'REJECTED'] 
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            status: true,
            message: true,
            createdAt: true
          }
        })
      ]);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        group,
        isMember: !!membership && !membership.isBanned,
        membership,
        joinRequest: joinRequest ? {
          ...joinRequest,
          status: joinRequest.status.toLowerCase() as 'pending' | 'approved' | 'rejected'
        } : null,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'group-join-details'],
    { 
      revalidate: 10, // Short cache for join status updates
      tags: [`group-${groupId}`, `user-${userId}`, 'join-requests'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

export async function fetchGroupInviteTokens(groupId: string, userId: string) {
  const cacheKey = `group-invites-${groupId}-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const membership = await prisma.roomMember.findFirst({
        where: {
          roomId: groupId,
          userId,
          role: { in: ['ADMIN', 'MODERATOR', 'MANAGER'] },
        },
      });

      if (!membership) {
        return encryptData({
          error: "Unauthorized",
          data: [],
          timestamp: new Date().toISOString(),
          executionTime: performance.now() - start
        });
      }

      const inviteTokens = await prisma.inviteToken.findMany({
        where: {
          roomId: groupId,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Generate invite URL for each token
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const formattedData = inviteTokens.map(token => ({
        ...token,
        inviteUrl: `${baseUrl}/groups/join/${token.token}`
      }));

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        data: formattedData,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'group-invites'],
    { 
      revalidate: 30, 
      tags: [`group-${groupId}-invites`, `user-${userId}`] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

export async function resolveInviteToken(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    select: {
      roomId: true,
      expiresAt: true,
      role: true
    }
  });

  if (!invite) return null;

  // Check expiration
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return null;
  }

  return invite;
}


// --- CRUD Operations ---

export type CreateGroupData = {
  name: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
  bannerUrl?: string;
  userId: string;
};

export async function createGroup(data: CreateGroupData) {
    const { name, description, isPrivate, maxMembers, bannerUrl, userId } = data;

    const group = await prisma.room.create({
      data: {
        name,
        description: description || '',
        isPrivate: isPrivate || false,
        maxMembers: maxMembers || 20,
        fineAmount: 0,
        fineEnabled: false,
        isActive: true,
        createdBy: userId,
        periodMode: 'MONTHLY',
        memberCount: 1,
        bannerUrl: bannerUrl || '/group-images/9099ffd8-d09b-4883-bac1-04be1274bb82.png',
        features: {
          join_requests: isPrivate,
          messages: true,
          announcements: true,
          member_roles: false,
          activity_log: true,
          shopping: true,
          meals: true,
          payments: true
        },
        members: {
          create: {
            userId: userId,
            role: 'ADMIN',
            isCurrent: true
          }
        }
      },
      include: {
        members: true
      }
    });

    if (!group) throw new Error("Failed to create group");

    return group;
}

export type UpdateGroupData = {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    maxMembers?: number;
    bannerUrl?: string;
    tags?: string[];
    features?: Record<string, boolean>;
};

export async function updateGroup(groupId: string, data: UpdateGroupData) {
    const updatedGroup = await prisma.room.update({
        where: { id: groupId },
        data: data,
    });

    return updatedGroup;
}

export async function deleteGroup(groupId: string) {
    const group = await prisma.room.findUnique({ where: { id: groupId } });
    if (!group) throw new Error("Group not found");

    await prisma.room.delete({ where: { id: groupId } });

    return true;
}

export async function joinGroup(groupId: string, userId: string, password?: string, token?: string) {
    const group = await prisma.room.findUnique({
        where: { id: groupId },
        select: {
             id: true, isPrivate: true, maxMembers: true, 
             members: { where: { userId }, select: { id: true } }
        }
    });

    if (!group) throw new Error('Group not found');
    if (group.members.length > 0) throw new Error('Already a member');
    
    // Allow private groups if a token is provided
    if (group.isPrivate && !token) throw new Error('Private group: Request access instead');
    
    let role = 'MEMBER';
    
    // Validate token if provided
    if (token) {
        const invite = await prisma.inviteToken.findUnique({
            where: { token },
            select: { roomId: true, role: true, expiresAt: true }
        });
        
        if (!invite || invite.roomId !== groupId) {
            throw new Error('Invalid or expired invite token');
        }
        
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            throw new Error('Invite token has expired');
        }
        
        role = invite.role;
    }
    
    const memberCount = await prisma.roomMember.count({ where: { roomId: groupId } });
    if (group.maxMembers && memberCount >= group.maxMembers) throw new Error('Group is full');

    const result = await prisma.roomMember.create({
        data: {
            userId,
            roomId: groupId,
            role: role as Role,
            isCurrent: true // Set as current group when joining via invite
        },
        include: {
            user: { select: { id: true, name: true, image: true } }
        }
    });

    await prisma.room.update({
        where: { id: groupId },
        data: { memberCount: memberCount + 1 }
    });
    
    // If it was a token join, update the token as used? 
    // The InviteToken model has usedAt but it's not unique per user. 
    // For simplicity, we just leave it or could update usedAt.
    if (token) {
        await prisma.inviteToken.update({
            where: { token },
            data: { usedAt: new Date() }
        });
    }
    
    return result;
}

export async function leaveGroup(groupId: string, userId: string) {
    const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId: groupId } },
        include: { room: true }
    });

    if (!membership) throw new Error("Not a member of this group");
    
    // Creator cannot leave (must delete or transfer ownership)
    if (membership.room.createdBy === userId) {
        throw new Error("CREATOR_CANNOT_LEAVE: You must transfer ownership or delete the group.");
    }

    await prisma.roomMember.delete({
        where: { userId_roomId: { userId, roomId: groupId } }
    });

    // Update member count
    await prisma.room.update({
        where: { id: groupId },
        data: { 
            memberCount: { decrement: 1 }
        }
    });

    return true;
}

export async function createJoinRequest(groupId: string, userId: string, message?: string) {
    const existing = await prisma.joinRequest.findUnique({
        where: { userId_roomId: { userId, roomId: groupId } }
    });

    if (existing) {
        if (existing.status === 'PENDING') throw new Error("Join request already pending");
        if (existing.status === 'APPROVED') throw new Error("Join request already approved");
        // If REJECTED, update to PENDING
        return await prisma.joinRequest.update({
            where: { id: existing.id },
            data: { status: 'PENDING', message, updatedAt: new Date() }
        });
    }

    const request = await prisma.joinRequest.create({
        data: {
            userId,
            roomId: groupId,
            message,
            status: 'PENDING'
        }
    });
    
    return request;
}

export async function getJoinRequestStatus(groupId: string, userId: string) {
    return await prisma.joinRequest.findUnique({
        where: { userId_roomId: { userId, roomId: groupId } },
        select: { status: true, message: true, createdAt: true }
    });
}

export async function fetchGroupRequests(groupId: string) {
    return await prisma.joinRequest.findMany({
        where: {
            roomId: groupId,
            status: 'PENDING'
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function processJoinRequest(requestId: string, action: 'approve' | 'reject') {
    const request = await prisma.joinRequest.findUnique({
        where: { id: requestId },
        include: { room: true }
    });

    if (!request) throw new Error("Request not found");

    if (action === 'approve') {
        const memberCount = await prisma.roomMember.count({ where: { roomId: request.roomId } });
        if (request.room.maxMembers && memberCount >= request.room.maxMembers) {
             throw new Error("Group is full");
        }

        await prisma.$transaction([
            prisma.joinRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' }
            }),
            prisma.roomMember.create({
                data: {
                    userId: request.userId,
                    roomId: request.roomId,
                    role: 'MEMBER'
                }
            }),
            prisma.room.update({
                where: { id: request.roomId },
                data: { memberCount: { increment: 1 } }
            })
        ]);
    } else {
        await prisma.joinRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        });
    }

    return { success: true };
}

export async function generateGroupInvite(groupId: string, userId: string, role: string = 'MEMBER', expiresInDays: number = 7) {
    // Validate the group exists and user has permission
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: userId,
            role: {
              in: [Role.ADMIN, Role.MODERATOR, Role.MANAGER]
            }
          }
        }
      }
    });

    if (!group) {
      throw new Error("Group not found");
    }

    if (group.members.length === 0) {
      throw new Error("Unauthorized - You need admin permissions to create invites");
    }

    // Check if group is full
    const currentMemberCount = await prisma.roomMember.count({
      where: { roomId: groupId }
    });

    if (group.maxMembers && currentMemberCount >= group.maxMembers) {
      throw new Error("Group is full. Cannot create more invites.");
    }

    // Generate a unique token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let token = '';
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresInDays !== null && expiresInDays !== 0) {
      const expiryMs = expiresInDays * 24 * 60 * 60 * 1000;
      expiresAt = new Date(Date.now() + expiryMs);
    }

    // Create invite token
    const inviteToken = await prisma.inviteToken.create({
      data: {
        token,
        roomId: groupId,
        createdBy: userId,
        role: role as Role,
        expiresAt
      }
    });

    // Create activity log
    await prisma.groupActivityLog.create({
      data: {
        type: "INVITE_TOKEN_CREATED",
        details: {
          token: token,
          role: role,
          expiresAt: expiresAt
        },
        roomId: groupId,
        userId: userId
      }
    });

    // Generate invite URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/groups/join/${token}`;

    return {
      token: inviteToken.token,
      inviteUrl,
      expiresAt: inviteToken.expiresAt,
      role: inviteToken.role
    };
}

export async function sendGroupInvitations(groupId: string, userId: string, emails: string[], role: string = 'MEMBER') {
    // Get group details and verify permissions
    const group = await prisma.room.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        members: {
          where: {
            userId: userId,
            role: {
              in: ["ADMIN", "MANAGER", "MODERATOR"]
            }
          }
        }
      },
    });

    if (!group) throw new Error("Group not found");
    if (group.members.length === 0) throw new Error("Unauthorized");

    // Get sender's information
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true }
    });

    if (!sender) throw new Error("Sender not found");

    const uniqueEmails = [...new Set(emails)];

    // Check for existing members
    const existingMemberUsers = await prisma.user.findMany({
      where: {
        email: { in: uniqueEmails },
        rooms: {
          some: { roomId: groupId }
        }
      },
      select: { email: true }
    });

    const existingMemberEmails = existingMemberUsers.map(u => u.email).filter((e): e is string => !!e);

    // Check for existing invitations
    const existingInvitations = await prisma.invitation.findMany({
      where: {
        email: { in: uniqueEmails },
        groupId,
        expiresAt: { gt: new Date() }
      },
      select: { email: true }
    });

    const pendingInviteEmails = existingInvitations.map(i => i.email);

    // Filter out emails that are already members or have pending invitations
    const validEmails = uniqueEmails.filter(email => 
      !existingMemberEmails.includes(email) && !pendingInviteEmails.includes(email)
    );

    const skipped = {
      existingMembers: existingMemberEmails,
      pendingInvitations: pendingInviteEmails
    };

    if (validEmails.length === 0) {
      return {
        success: true,
        message: `All emails are already members or have pending invitations`,
        skipped
      };
    }

    // Create invitations and send emails
    const invitations = await Promise.all(
      validEmails.map(async (email) => {
        const invitation = await prisma.invitation.create({
          data: {
            code: Math.random().toString(36).substring(2, 15),
            email: email,
            role: role as any,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            groupId,
            createdBy: userId
          }
        });

        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/groups/join?code=${invitation.code}&groupId=${groupId}`;

        await sendGroupInviteEmail(
          email,
          email.split('@')[0],
          group.name,
          inviteUrl,
          role,
          sender as any
        );

        return invitation;
      })
    );

    return {
      success: true,
      message: `Successfully sent ${invitations.length} invitation(s).`,
      invitations: invitations.map(inv => ({
        code: inv.code,
        email: inv.email,
        expiresAt: inv.expiresAt,
        groupId: inv.groupId
      })),
      skipped
    };
}


export async function setCurrentGroup(groupId: string, userId: string) {
    await prisma.$transaction([
        // Unset current for all user's groups
        prisma.roomMember.updateMany({
            where: { userId, isCurrent: true },
            data: { isCurrent: false }
        }),
        // Set new current
        prisma.roomMember.update({
             where: { userId_roomId: { userId, roomId: groupId } },
             data: { isCurrent: true }
        })
    ]);
    
    return true;
}

export async function updatePeriodMode(groupId: string, mode: 'MONTHLY' | 'CUSTOM') {
    const updatedGroup = await prisma.room.update({
        where: { id: groupId },
        data: { periodMode: mode }
    });
    
    return updatedGroup;
}
