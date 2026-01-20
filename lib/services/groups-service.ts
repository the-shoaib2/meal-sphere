import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';

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
