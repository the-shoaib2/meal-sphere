import { prisma } from '@/lib/services/prisma';
import { cacheGetOrSet } from '@/lib/cache/cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { Role } from '@prisma/client';

/**
 * Group-specific query helpers with built-in caching
 * Optimized for performance with selective field loading
 */

/**
 * Get user's groups with caching
 */
export async function getUserGroups(userId: string, includeMembers = false) {
  const cacheKey = `user_groups:${userId}:${includeMembers}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const memberGroups = await prisma.roomMember.findMany({
        where: {
          userId,
          room: { isActive: true }
        },
        select: {
          role: true,
          joinedAt: true,
          isCurrent: true,
          room: {
            select: {
              id: true,
              name: true,
              description: true,
              isPrivate: true,
              createdAt: true,
              bannerUrl: true,
              createdByUser: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              memberCount: true,
              _count: {
                select: {
                  members: true
                }
              },
              ...(includeMembers && {
                members: {
                  select: {
                    id: true,
                    userId: true,
                    role: true,
                    joinedAt: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                      }
                    }
                  },
                  take: 10 // Limit to first 10 members
                }
              })
            },
          },
        },
        orderBy: {
          joinedAt: 'desc'
        }
      });

      return memberGroups.map((member: any) => ({
        ...member.room,
        userRole: member.role,
        permissions: ROLE_PERMISSIONS[member.role as Role] || [],
        joinedAt: member.joinedAt,
        isCurrent: member.isCurrent,
        memberCount: member.room._count?.members ?? member.room.memberCount,
        isCurrentMember: true,
      }));
    },
    { 
      ttl: CACHE_TTL.GROUPS_LIST || 120,
      tags: ['groups', `user:${userId}`]
    }
  );
}

/**
 * Get group with members (optimized)
 */
export async function getGroupWithMembers(groupId: string, userId?: string) {
  const cacheKey = `group_with_members:${groupId}:${userId || 'public'}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const group = await prisma.room.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          description: true,
          isPrivate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          bannerUrl: true,
          category: true,
          maxMembers: true,
          fineAmount: true,
          fineEnabled: true,
          periodMode: true,
          tags: true,
          features: true,
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          members: {
            select: {
              id: true,
              userId: true,
              role: true,
              joinedAt: true,
              isBanned: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                }
              }
            },
            where: userId ? undefined : { isBanned: false },
            orderBy: { joinedAt: 'asc' }
          },
          memberCount: true,
          _count: {
            select: {
              members: true
            }
          }
        },
      });

      if (!group) return null;

      // If userId provided, get user's role
      let userRole = null;
      let userJoinedAt = null;
      if (userId) {
        const member = group.members.find((m: any) => m.userId === userId);
        if (member) {
          userRole = member.role;
          userJoinedAt = member.joinedAt;
        }
      }

      return {
        ...group,
        userRole,
        permissions: userRole ? (ROLE_PERMISSIONS[userRole as Role] || []) : [],
        joinedAt: userJoinedAt,
        memberCount: group._count?.members ?? group.memberCount,
        isCurrentMember: !!userRole,
      };
    },
    { 
      ttl: CACHE_TTL.GROUP_DETAILS || 180,
      tags: ['groups', `group:${groupId}`]
    }
  );
}

/**
 * Get public groups (cached)
 */
export async function getPublicGroups(limit = 50, userId?: string) {
  const cacheKey = `public_groups:${limit}:${userId || 'anonymous'}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const groups = await prisma.room.findMany({
        where: {
          isActive: true,
          isPrivate: false
        },
        select: {
          id: true,
          name: true,
          description: true,
          isPrivate: true,
          createdAt: true,
          bannerUrl: true,
          // Optimized: removed category, tags as they aren't used in main list
          createdByUser: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              members: true
            }
          },
          /*
          ...(userId && {
            members: {
              where: { userId },
              select: {
                role: true,
                joinedAt: true
              },
              take: 1
            }
          })
          */
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      // Optimized: Batch fetch memberships for the current user to avoid N+1 queries
      const userMemberships = userId 
        ? await prisma.roomMember.findMany({
            where: {
              userId,
              roomId: { in: groups.map(g => g.id) }
            },
            select: {
              roomId: true,
              role: true,
              joinedAt: true
            }
          })
        : [];

      const membershipMap = new Map(userMemberships.map(m => [m.roomId, m]));

      return groups.map((group: any) => {
        const membership = membershipMap.get(group.id);
        
        return {
          ...group,
          userRole: membership?.role || null,
          permissions: membership?.role ? (ROLE_PERMISSIONS[membership.role as Role] || []) : [],
          joinedAt: membership?.joinedAt || null,
          memberCount: group._count?.members ?? 0,
          isCurrentMember: !!membership,
          members: [] // Don't expose full member list
        };
      });
    },
    { 
      ttl: CACHE_TTL.GROUPS_LIST || 120,
      tags: ['groups', 'public_groups']
    }
  );
}

/**
 * Batch get group member counts
 */
export async function getBatchGroupMemberCounts(groupIds: string[]): Promise<Map<string, number>> {
  if (groupIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(groupIds)];
  
  const counts = await prisma.room.findMany({
    where: {
      id: { in: uniqueIds }
    },
    select: {
      id: true,
      memberCount: true
    }
  });
  
  const countMap = new Map<string, number>();
  counts.forEach((group: any) => {
    countMap.set(group.id, group.memberCount);
  });
  
  // Fill in zeros for groups not found
  uniqueIds.forEach(id => {
    if (!countMap.has(id)) {
      countMap.set(id, 0);
    }
  });
  
  return countMap;
}

/**
 * Get user's role in group (cached)
 */
export async function getUserRoleInGroup(userId: string, groupId: string): Promise<string | null> {
  const cacheKey = `user_role:${userId}:${groupId}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const member = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId: groupId
          }
        },
        select: {
          role: true
        }
      });
      
      return member?.role || null;
    },
    { ttl: CACHE_TTL.GROUP_ROLE || 300 }
  );
}

/**
 * Check if user is member (cached)
 */
export async function isUserMemberOfGroup(userId: string, groupId: string): Promise<boolean> {
  const cacheKey = `is_member:${userId}:${groupId}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const member = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId: groupId
          }
        },
        select: {
          id: true
        }
      });
      
      return !!member;
    },
    { ttl: CACHE_TTL.GROUP_ROLE || 300 }
  );
}

/**
 * Get group join requests (cached)
 */
export async function getGroupJoinRequests(groupId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  const cacheKey = `join_requests:${groupId}:${status || 'all'}`;
  
  return cacheGetOrSet(
    cacheKey,
    async () => {
      return await prisma.joinRequest.findMany({
        where: {
          roomId: groupId,
          ...(status && { status })
        },
        select: {
          id: true,
          userId: true,
          message: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    },
    { ttl: CACHE_TTL.JOIN_REQUESTS || 60 }
  );
}
