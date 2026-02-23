import { prisma } from '@/lib/services/prisma';
import * as bcrypt from 'bcryptjs';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { cacheDelete, cacheDeletePattern } from '@/lib/cache/cache-service';
import { Role, NotificationType } from '@prisma/client';
import { sendGroupInviteEmail } from './email-utils';

import { getUserGroups, getPublicGroups, getGroupWithMembers } from '@/lib/group-query-helpers';
import { getGroupData } from '@/lib/auth/group-auth';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';

export async function fetchGroupsList(userId: string | undefined, filter: string) {
    // Generate cache key based on user and filter
    const cacheKey = `groups_list:${userId || 'anonymous'}:${filter}`;

    const cachedFn = unstable_cache(
      async () => {
        // If user is not authenticated OR filter is 'public', return public groups
        if (!userId || filter === 'public') {
          return await getPublicGroups(50, userId);
        }

        // For 'all' filter - Optimized Single Query
        if (filter === 'all') {
             const groups = await prisma.room.findMany({
                where: { 
                    isActive: true,
                    OR: [
                        { isPrivate: false },
                        { members: { some: { userId: userId } } }
                    ]
                },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isPrivate: true,
                  createdAt: true,
                  bannerUrl: true,
                  _count: { select: { members: true } },
                  createdByUser: {
                    select: { id: true, name: true, image: true }
                  },
                  members: {
                    select: { role: true, joinedAt: true, isCurrent: true, userId: true, user: { select: { id: true, name: true, image: true } } },
                    take: 5,
                    orderBy: { role: 'asc' }
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 100
             });

          // Standardize response format
          return groups.map((group: any) => {
            const myMembership = group.members?.find((m: any) => m.userId === userId);
            const role = (myMembership?.role as Role) || null;
            return {
              ...group,
              members: group.members || [], 
              userRole: role,
              permissions: role ? (ROLE_PERMISSIONS[role] || []) : [],
              joinedAt: myMembership?.joinedAt || null,
              isCurrent: myMembership?.isCurrent || false,
              isCurrentMember: !!myMembership
            };
          });
        }

        // Default: for authenticated users, return groups where they are members
        return await getUserGroups(userId, true);
      },
      [cacheKey],
      { 
        revalidate: CACHE_TTL.GROUPS_LIST,
        tags: ['groups', userId ? `user-${userId}` : 'anonymous']
      }
    );

    return await cachedFn();
}

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
        myGroups: myGroupsRaw.map(group => ({
          ...group,
          members: group.members.map(m => ({
            ...m,
            joinedAt: m.joinedAt.toISOString()
          }))
        })),
        publicGroups: publicGroupsRaw.map(group => ({
          ...group,
          members: group.members.map(m => ({
            ...m,
            joinedAt: m.joinedAt.toISOString()
          }))
        })),
        joinRequests: joinRequestsRaw,
        activeGroup: activeGroup || null,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return result;
    },
    [cacheKey, 'groups-data'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, 'groups'] 
    }
  );

  return await cachedFn();
}

export async function fetchGroupDetails(groupId: string, userId: string) {
  const cacheKey = `group-details-${groupId}-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Fetch group and user's membership in one go to determine access level
      const [group, userMembership] = await Promise.all([
        prisma.room.findUnique({
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
              select: {
                id: true,
                role: true,
                joinedAt: true,
                userId: true,
                isBanned: true,
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
        }),
        prisma.roomMember.findUnique({
          where: {
            userId_roomId: {
              userId: userId,
              roomId: groupId
            }
          },
          select: { role: true, isBanned: true }
        })
      ]);

      if (!group) return null;

      const isMember = !!userMembership && !userMembership.isBanned;
      const isAdmin = userMembership?.role === 'ADMIN' || userMembership?.role === 'MANAGER';
      const canViewSensitive = isMember || isAdmin;

      const sanitizedMembers = group.members
        .filter(member => !member.isBanned)
        .map(member => {
          if (!canViewSensitive) {
            return {
              ...member,
              user: {
                ...member.user,
                email: null 
              },
              permissions: null,
              invites: []
            };
          }
          return member;
        });

      // Sanitize Creator if needed, though usually less critical, strictness is good
      const sanitizedCreator = {
        ...group.createdByUser,
        email: canViewSensitive ? group.createdByUser.email : null
      };

      return encryptData({
        group: {
            ...group,
            createdByUser: sanitizedCreator,
            members: sanitizedMembers
        },
        userMembership,
        timestamp: new Date().toISOString(),
        executionTime: performance.now() - start
      });
    },
    [cacheKey, 'group-details'],
    { 
      revalidate: 30, 
      tags: [`group-${groupId}`, `user-${userId}`] 
    }
  );

  const encrypted = await cachedFn();
  return encrypted ? decryptData(encrypted) : null;
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
            createdBy: true,
            password: true,
            maxMembers: true,
            tags: true,
            features: true
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

      const groupWithExtras = {
        ...group,
        hasPassword: !!group.password,
        password: undefined
      };

      const result = {
        isMember,
        userRole,
        permissions,
        canAccess,
        isAdmin,
        isCreator,
        groupId,
        group: groupWithExtras,
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
  return encrypted ? decryptData(encrypted) : null;
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
            bannerUrl: true,
            createdAt: true,
            fineEnabled: true,
            fineAmount: true,
            password: true,
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

      const isMember = !!membership && !membership.isBanned;

      const result = {
        group: group ? {
            ...group,
            inviter: null, // Removed default group.createdByUser
            hasPassword: !!group?.password,
            password: undefined
        } : null,
        isMember,
        membership,
        joinRequest: (joinRequest && !(joinRequest.status === 'APPROVED' && !isMember)) ? {
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
  return encrypted ? decryptData(encrypted) : null;
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
  return encrypted ? decryptData(encrypted) : null;
}

export async function resolveInviteToken(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    select: {
      roomId: true,
      expiresAt: true,
      role: true,
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      }
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
  password?: string;
};

export async function createGroup(data: CreateGroupData) {
    const { name, description, isPrivate, maxMembers, bannerUrl, userId, password } = data;

    let hashedPassword = null;
    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

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
        password: hashedPassword,
        bannerUrl: bannerUrl || '/images/9099ffd8-d09b-4883-bac1-04be1274bb82.png',
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

    revalidateTag(`user-${userId}`);
    revalidateTag('groups');
    await cacheDeletePattern('groups_list:*');

    return group;
}

export type UpdateGroupData = {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    maxMembers?: number;
    bannerUrl?: string | null;
    tags?: string[];
    features?: Record<string, boolean>;
    password?: string | null;
};

export async function updateGroup(groupId: string, data: UpdateGroupData) {
    const { password, ...otherData } = data;
    
    let updateData: any = { ...otherData };
    
    if (password !== undefined) {
        if (password === null) {
            updateData.password = null;
        } else {
             updateData.password = await bcrypt.hash(password, 10);
        }
    }

    const updatedGroup = await prisma.room.update({
        where: { id: groupId },
        data: updateData,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
    });

    await Promise.all([
      cacheDeletePattern(`group_details:${groupId}:*`),
      cacheDeletePattern(`groups_list:*`),
      cacheDeletePattern(`group_with_members:${groupId}:*`)
    ]);
    
    // Also revalidate next tags
    revalidateTag(`group-${groupId}`);
    revalidateTag('groups');

    return updatedGroup;
}

export async function fetchGroupActivityLogs(groupId: string, userId: string) {
    const cacheKey = `group-activity:${groupId}:${userId}`;
    
    // Authorization check
    const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId: groupId } },
        select: { role: true, isBanned: true }
    });

    if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
        throw new Error('Unauthorized');
    }

    if (membership.isBanned) {
        throw new Error('You are banned from this group');
    }

    const cachedFn = unstable_cache(
        async () => {
            const data = await prisma.groupActivityLog.findMany({
                where: { roomId: groupId },
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
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            return data;
        },
        [cacheKey],
        { 
            revalidate: 60, // 1 minute cache
            tags: [`group-${groupId}`, `group-${groupId}-activity`]
        }
    );

    return await cachedFn();
}

export async function deleteGroup(groupId: string, userId: string) {
    const group = await prisma.room.findUnique({ where: { id: groupId } });
    if (!group) throw new Error("Group not found");

    // Authorization check should be here or outside. 
    // Assuming outside for now or simplistic check if userId passed.
    if (group.createdBy !== userId) {
        throw new Error('Only the group creator can delete this group');
    }

    await prisma.room.delete({ where: { id: groupId } });

    revalidateTag(`group-${groupId}`);
    revalidateTag(`user-${userId}`);
    revalidateTag('groups');
    await cacheDeletePattern('groups_list:*');

    return true;
}

export async function joinGroup(groupId: string, userId: string, password?: string, token?: string) {
    const [group, invite] = await Promise.all([
        prisma.room.findUnique({
            where: { id: groupId },
            select: {
                 id: true, isPrivate: true, maxMembers: true, password: true, memberCount: true,
                 members: { where: { userId }, select: { id: true } }
            }
        }),
        token ? prisma.inviteToken.findUnique({
            where: { token },
            select: { roomId: true, role: true, expiresAt: true }
        }) : Promise.resolve(null)
    ]);

    if (!group) throw new Error('Group not found');
    if (group.members.length > 0) throw new Error('Already a member');
    
    // Check password if private and no token
    if (group.isPrivate && !token) {
        if (group.password) {
             if (password) {
                 const isValid = await bcrypt.compare(password, group.password);
                 if (!isValid) throw new Error('Invalid password');
             } else {
                 throw new Error('Password required');
             }
        } else {
             throw new Error('Private group: Request access instead');
        }
    }
    
    let role = 'MEMBER';
    
    // Validate token if provided
    if (token) {
        if (!invite || invite.roomId !== groupId) {
            throw new Error('Invalid or expired invite token');
        }
        
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            throw new Error('Invite token has expired');
        }
        
        role = invite.role;
    }
    
    if (group.maxMembers && group.memberCount >= group.maxMembers) throw new Error('Group is full');

    // SECURITY FIX: If group is private, ALWAYS create a join request instead of joining immediately
    // This ensures admin approval is required as stated in the UI.
    if (group.isPrivate) {
        let message = token ? "Invited via token" : "Joined with password";
        
        const mutations: any[] = [
            prisma.joinRequest.upsert({
                where: {
                    userId_roomId: {
                        userId,
                        roomId: groupId
                    }
                },
                update: {
                    status: 'PENDING',
                    message,
                    updatedAt: new Date()
                },
                create: {
                    roomId: groupId,
                    userId,
                    message,
                    status: 'PENDING'
                }
            })
        ];

        if (token) {
            mutations.push(
                prisma.inviteToken.update({
                    where: { token },
                    data: { usedAt: new Date() }
                })
            );
        }

        const [joinRequest] = await prisma.$transaction(mutations);

        revalidateTag(`group-${groupId}`);
        revalidateTag(`user-${userId}`);

        return {
            requestCreated: true,
            joinRequest
        };
    }

    const mutations: any[] = [
        prisma.roomMember.create({
            data: {
                userId,
                roomId: groupId,
                role: role as Role,
                isCurrent: true 
            },
            include: {
                user: { select: { id: true, name: true, image: true } },
                room: { select: { name: true } }
            }
        }),
        prisma.room.update({
            where: { id: groupId },
            data: { memberCount: { increment: 1 } }
        })
    ];

    if (token) {
        mutations.push(
            prisma.inviteToken.update({
                where: { token },
                data: { usedAt: new Date() }
            })
        );
    }

    const [result] = await prisma.$transaction(mutations);

    // Notify Admins
    const admins = await prisma.roomMember.findMany({
        where: { roomId: groupId, role: 'ADMIN', userId: { not: userId } },
        select: { userId: true }
    });

    if (admins.length > 0 && result) {
        await prisma.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.userId,
                type: 'GENERAL',
                message: `${result.user?.name || 'A user'} has joined your group "${result.room?.name || 'Group'}".`
            }))
        });
    }

    // Notify the user who just joined
    if (result) {
        await prisma.notification.create({
            data: {
                userId: userId,
                type: 'GENERAL',
                message: `Welcome to ${result.room?.name || 'the group'}! You have successfully joined as a member.`
            }
        });
    }

    revalidateTag(`group-${groupId}`);
    revalidateTag(`user-${userId}`);
    revalidateTag('groups');
    
    return {
        requestCreated: false,
        membership: result
    };
}

export async function leaveGroup(groupId: string, userId: string) {
    const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId: groupId } },
        include: { room: true, user: true }
    });

    if (!membership) throw new Error("Not a member of this group");
    
    // Check if creator logic is still valid or if we allow creator to leave if they are the only one?
    // "CREATOR_CANNOT_LEAVE" check was here.
    // However, members/me/route.ts allowed deleting group if last member.
    
    // New Logic compatible with members/me/route.ts
    // 1. Get all members
    const groupMembers = await prisma.roomMember.findMany({
        where: { roomId: groupId },
        orderBy: { joinedAt: 'asc' }
    });

    // 2. If user is ADMIN and there are other members, promote someone else
    if (membership.role === 'ADMIN' && groupMembers.length > 1) {
        // Find another admin or next oldest
        const nextAdmin = groupMembers.find(
            m => m.userId !== userId && m.role === 'ADMIN'
        ) || groupMembers.find(m => m.userId !== userId);

        if (nextAdmin && nextAdmin.role !== 'ADMIN') {
            await prisma.roomMember.update({
                where: { id: nextAdmin.id },
                data: { role: 'ADMIN' }
            });
        }
    }

    // 3. Delete membership
    await prisma.roomMember.delete({
        where: { userId_roomId: { userId, roomId: groupId } }
    });

    // 4. Check remaining members
    const remainingMembers = await prisma.roomMember.count({
        where: { roomId: groupId }
    });

    if (remainingMembers === 0) {
        // Delete group if empty
        await prisma.room.delete({ where: { id: groupId } });
        cacheDelete(`groups_list:*`);
    } else {
        // Update count
        await prisma.room.update({
            where: { id: groupId },
            data: { memberCount: remainingMembers }
        });

        // Notify Admins that user left (only if group still has members)
        const admins = await prisma.roomMember.findMany({
            where: { roomId: groupId, role: 'ADMIN' },
            select: { userId: true }
        });

        if (admins.length > 0) {
            await prisma.notification.createMany({
                data: admins.map(admin => ({
                    userId: admin.userId,
                    type: 'GENERAL',
                    message: `${membership.user?.name || 'A user'} has left your group "${membership.room.name}".`
                }))
            });
        }
    }

    revalidateTag(`group-${groupId}`);
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
        },
        include: {
            room: { select: { name: true } },
            user: { select: { name: true } }
        }
    });

    // Notify Group Admins
    const admins = await prisma.roomMember.findMany({
        where: { roomId: groupId, role: 'ADMIN' },
        select: { userId: true }
    });

    if (admins.length > 0) {
        await prisma.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.userId,
                type: NotificationType.GENERAL,
                message: `${request.user.name || 'A user'} has requested to join your group "${request.room.name}".`
            }))
        });
    }
    
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
            }),
            prisma.notification.create({
                data: {
                    userId: request.userId,
                    type: 'JOIN_REQUEST_APPROVED',
                    message: `Your join request for ${request.room.name} has been approved! Welcome to the group.`
                }
            })
        ]);
    } else {
        await prisma.$transaction([
            prisma.joinRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED' }
            }),
            prisma.notification.create({
                data: {
                    userId: request.userId,
                    type: 'JOIN_REQUEST_REJECTED',
                    message: `Your join request for ${request.room.name} has been rejected.`
                }
            })
        ]);
    }

    revalidateTag(`group-${request.roomId}`, 'max');
    revalidateTag(`user-${request.userId}`, 'max');
    revalidateTag('join-requests', 'max'); 
    revalidateTag(`group-${request.roomId}-join-requests`, 'max'); 

    return { success: true };
}

// Generate group invite
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
      return ("Group not found");
    }

    if (group.members.length === 0) {
      throw new Error("Unauthorized - You need admin permissions to create invites");
    }

    // Check if group is full
    const currentMemberCount = await prisma.roomMember.count({
      where: { roomId: groupId }
    });

    if (group.maxMembers && currentMemberCount >= group.maxMembers) {
      return ("Group is full. Cannot create more invites.");
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

    revalidateTag(`group-${groupId}-invites`, 'max');
    
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

    revalidateTag(`user-${userId}`);
    revalidateTag('groups');
    
    return true;
}

export async function updatePeriodMode(groupId: string, mode: 'MONTHLY' | 'CUSTOM', userId: string) {
    // 1. Fetch all necessary data in parallel
    const [room, member, activePeriod] = await Promise.all([
        prisma.room.findUnique({
            where: { id: groupId },
            select: { periodMode: true }
        }),
        prisma.roomMember.findFirst({
            where: {
                roomId: groupId,
                userId: userId,
            },
            select: { role: true } // Optimized select
        }),
        prisma.mealPeriod.findFirst({
            where: {
                roomId: groupId,
                status: 'ACTIVE',
            },
        })
    ]);

    if (!room) {
        throw new Error('Group not found');
    }

    // Check permissions
    let canChange = false;
    if (member && ['ADMIN', 'MANAGER', 'MODERATOR'].includes(member.role)) {
        canChange = true;
    }

    if (!canChange) {
        throw new Error('Insufficient permissions. Only admins or authorized staff can change period mode.');
    }

    // 1. If currently in MONTHLY mode and has an active period, cannot change mode
    if (room.periodMode === 'MONTHLY' && activePeriod) {
         throw new Error('Cannot change period mode while a monthly period is active. Please end the current period first.');
    }

    // Update the room's period mode
    const updatedRoom = await prisma.room.update({
        where: { id: groupId },
        data: { periodMode: mode },
    });

    // 2. If switching to MONTHLY mode, create current month period if no active period exists
    if (mode === 'MONTHLY' && !activePeriod) {
        const now = new Date();
        const monthName = format(now, 'MMMM yyyy');
        const startDate = startOfMonth(now);

        // Check if a period with this name already exists (any status)
        const existingMonthPeriod = await prisma.mealPeriod.findFirst({
            where: {
                roomId: groupId,
                name: monthName,
            },
        });

        if (!existingMonthPeriod) {
            await prisma.mealPeriod.create({
                data: {
                    name: monthName,
                    startDate,
                    endDate: null,
                    status: 'ACTIVE',
                    roomId: groupId,
                    createdBy: userId,
                    openingBalance: 0,
                    carryForward: false,
                },
            });
        }
    }

    revalidateTag(`group-${groupId}`);
    
    return updatedRoom;
}

// --- Notifications ---

export async function getNotificationSettings(groupId: string, userId: string) {
    const settings = await prisma.groupNotificationSettings.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!settings) {
      return {
        groupMessages: true,
        announcements: true,
        mealUpdates: true,
        memberActivity: true,
        joinRequests: false,
      };
    }
    return settings;
}

export async function updateNotificationSettings(groupId: string, userId: string, settings: any) {
    const { groupMessages, announcements, mealUpdates, memberActivity, joinRequests } = settings;

    return await prisma.groupNotificationSettings.upsert({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      create: {
        userId,
        groupId,
        groupMessages,
        announcements,
        mealUpdates,
        memberActivity,
        joinRequests,
      },
      update: {
        groupMessages,
        announcements,
        mealUpdates,
        memberActivity,
        joinRequests,
      },
    });
}

// --- Member Management ---

export async function removeMemberFromGroup(groupId: string, adminUserId: string, targetMemberId: string) {
    // Check admin permissions
    const adminMember = await prisma.roomMember.findFirst({
        where: { roomId: groupId, userId: adminUserId }
    });

    if (!adminMember || !['ADMIN', 'MANAGER'].includes(adminMember.role)) {
        throw new Error("Unauthorized: Only admins can remove members");
    }

    const targetMember = await prisma.roomMember.findUnique({
        where: { id: targetMemberId, roomId: groupId },
        include: { user: true }
    });

    if (!targetMember) throw new Error("Member not found");

    if (targetMember.role === 'ADMIN' || targetMember.role === 'MANAGER') {
         throw new Error("Cannot remove an admin/owner");
    }

    await prisma.roomMember.delete({
        where: { id: targetMemberId }
    });

    // Log activity
    await prisma.groupActivityLog.create({
        data: {
            type: 'MEMBER_REMOVED',
            roomId: groupId,
            userId: adminUserId,
            details: {
                targetUserId: targetMember.userId,
                targetUserName: targetMember.user.name
            }
        }
    });

    // Notification
    await prisma.notification.create({
        data: {
          userId: targetMember.userId,
          type: NotificationType.MEMBER_REMOVED,
          message: 'You have been removed from the group'
        }
    });

    // Update count
    const count = await prisma.roomMember.count({ where: { roomId: groupId } });
    await prisma.room.update({
        where: { id: groupId },
        data: { memberCount: count }
    });

    revalidateTag(`group-${groupId}`);
    return true;
}

export async function updateMemberRole(groupId: string, adminUserId: string, targetMemberId: string, newRole: Role) {
     // Check admin permissions
    const adminMember = await prisma.roomMember.findFirst({
        where: { roomId: groupId, userId: adminUserId }
    });

    if (!adminMember || !['ADMIN', 'MANAGER'].includes(adminMember.role)) { 
        throw new Error("Unauthorized");
    }

    const targetMember = await prisma.roomMember.findUnique({
        where: { id: targetMemberId, roomId: groupId },
        include: { user: true }
    });
    
    // Support previous behavior where ID might be User ID if primary lookup fails
    if (!targetMember) {
         // Try finding by userId
        const targetByUserId = await prisma.roomMember.findUnique({
            where: { userId_roomId: { userId: targetMemberId, roomId: groupId } },
            include: { user: true }
        });
        
        if (!targetByUserId) throw new Error("Member not found");
        
        return await _performRoleUpdate(groupId, adminUserId, targetByUserId, newRole);
    }
    
    return await _performRoleUpdate(groupId, adminUserId, targetMember, newRole);
}

async function _performRoleUpdate(groupId: string, adminId: string, targetMember: any, newRole: Role) {
    if (targetMember.role === 'MANAGER') throw new Error("Cannot change owner role");

    const updated = await prisma.roomMember.update({
        where: { id: targetMember.id },
        data: { role: newRole },
        include: { user: true }
    });

    // Log activity
    await prisma.groupActivityLog.create({
      data: {
        type: "ROLE_CHANGED",
        roomId: groupId,
        userId: adminId,
        details: {
          targetUserId: targetMember.userId,
          targetUserName: targetMember.user.name,
          newRole: newRole
        }
      }
    });

    // Notification
    await prisma.notification.create({
      data: {
        userId: targetMember.userId,
        type: NotificationType.MEMBER_ADDED, // Reusing type
        message: `Your role has been changed to ${newRole}`
      }
    });
    
    revalidateTag(`group-${groupId}`);
    return updated;
}
