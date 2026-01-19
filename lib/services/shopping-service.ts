import { prisma } from '@/lib/services/prisma';
import { unstable_cache } from 'next/cache';
import { encryptData, decryptData } from '@/lib/encryption';
import { getCurrentPeriod } from '@/lib/utils/period-utils';

/**
 * Fetches all shopping-related data for a user in a specific group
 * Uses unstable_cache for caching and encrypts cached data for security
 * All queries run in parallel using Promise.all()
 */
export async function fetchShoppingData(userId: string, groupId: string) {
  const cacheKey = `shopping-data-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      // Get current period first
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        // No active period - return empty data
        return encryptData({
          items: [],
          purchasedItems: [],
          unpurchasedItems: [],
          statistics: {
            total: 0,
            purchased: 0,
            unpurchased: 0,
            totalQuantity: 0
          },
          currentPeriod: null,
          roomData: null,
          userRole: null,
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      // Parallel queries for all shopping-related data
      const [
        allItems,
        purchasedItems,
        unpurchasedItems,
        itemStats,
        roomData,
        membership
      ] = await Promise.all([
        // All shopping items for current period
        prisma.shoppingItem.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }),
        
        // Purchased items
        prisma.shoppingItem.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id,
            purchased: true
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }),
        
        // Unpurchased items
        prisma.shoppingItem.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id,
            purchased: false
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }),
        
        // Shopping statistics
        prisma.shoppingItem.aggregate({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _count: {
            id: true
          },
          _sum: {
            quantity: true
          }
        }),
        
        // Room data
        prisma.room.findUnique({
          where: {
            id: groupId
          },
          select: {
            id: true,
            name: true,
            memberCount: true,
            isPrivate: true
          }
        }),
        
        // User membership and role
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
        })
      ]);

      // Calculate purchased/unpurchased counts
      const purchasedCount = purchasedItems.length;
      const unpurchasedCount = unpurchasedItems.length;

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        items: allItems,
        purchasedItems,
        unpurchasedItems,
        statistics: {
          total: itemStats._count.id,
          purchased: purchasedCount,
          unpurchased: unpurchasedCount,
          totalQuantity: itemStats._sum.quantity || 0
        },
        currentPeriod,
        roomData,
        userRole: membership?.role || null,
        isBanned: membership?.isBanned || false,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'shopping-data'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, `group-${groupId}`, 'shopping'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

/**
 * Fetches shopping list summary with categorization
 */
export async function fetchShoppingSummary(userId: string, groupId: string) {
  const cacheKey = `shopping-summary-${userId}-${groupId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const start = performance.now();
      
      const currentPeriod = await getCurrentPeriod(groupId);
      
      if (!currentPeriod) {
        return encryptData({
          byCategory: [],
          byUser: [],
          recentActivity: [],
          timestamp: new Date().toISOString(),
          executionTime: 0
        });
      }

      const [byUser, recentActivity] = await Promise.all([
        // Items grouped by user
        prisma.shoppingItem.groupBy({
          by: ['userId'],
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          _count: {
            id: true
          }
        }),
        
        // Recent shopping activity
        prisma.shoppingItem.findMany({
          where: {
            roomId: groupId,
            periodId: currentPeriod.id
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 20
        })
      ]);

      const end = performance.now();
      const executionTime = end - start;

      const result = {
        byUser: byUser.map(u => ({
          userId: u.userId,
          count: u._count.id
        })),
        recentActivity,
        timestamp: new Date().toISOString(),
        executionTime
      };

      return encryptData(result);
    },
    [cacheKey, 'shopping-summary'],
    { 
      revalidate: 60, 
      tags: [`user-${userId}`, `group-${groupId}`, 'shopping', 'summary'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}
