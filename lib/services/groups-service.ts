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
