"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import * as ShoppingService from "@/lib/services/shopping-service";
import { uploadReceipt } from "@/lib/utils/upload-utils";
import { NotificationType } from "@prisma/client";
import { validateActivePeriod } from "@/lib/utils/period-utils";
import { notifyRoomMembersBatch } from "@/lib/utils/notification-utils";
import { invalidateShoppingCache } from "@/lib/cache/cache-invalidation";


async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (!session?.user?.email) throw new Error("Unauthorized");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");
    return user.id;
  }
  return session.user.id;
}

async function validateMembership(userId: string, roomId: string) {
  const member = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId, roomId } },
  });
  if (!member) throw new Error("You are not a member of this room");
  return member;
}

export async function createShoppingItemAction(formData: FormData) {
  try {
    const userId = await getUserId();
    const roomId = formData.get("roomId") as string;
    const description = formData.get("description") as string;
    const amount = Number.parseFloat(formData.get("amount") as string);
    const date = new Date(formData.get("date") as string);
    const receiptFile = formData.get("receipt") as File | null;

    if (!roomId || !description || isNaN(amount) || !date) {
      return { success: false, message: "Invalid data provided" };
    }

    await validateMembership(userId, roomId);
    await validateActivePeriod(roomId);

    let receiptUrl = null;
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile, userId, roomId);
    }

    const { getPeriodAwareWhereClause } = await import("@/lib/utils/period-utils");
    const activeFilter = await getPeriodAwareWhereClause(roomId, { roomId });
    if ((activeFilter as any)?.periodId === null) {
       return { success: false, message: "No active period found" };
    }
    
    let finalPeriodId = (activeFilter as any)?.periodId;
    if (!finalPeriodId && activeFilter) {
       const { getCurrentPeriod } = await import("@/lib/utils/period-utils");
       finalPeriodId = (await getCurrentPeriod(roomId))?.id;
    }

    if (!finalPeriodId) {
      return { success: false, message: "Required active period." };
    }

    const shoppingItem = await ShoppingService.createShoppingItem(userId, roomId, {
      description: description.substring(0, 50) || 'Shopping Item',
      amount,
      date,
      receiptUrl,
      periodId: finalPeriodId
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    await notifyRoomMembersBatch(
      roomId,
      NotificationType.PAYMENT_CREATED,
      `${user?.name || 'Someone'} added a new shopping item of ${amount} for ${description} in ${room?.name || 'the group'}.`,
      userId
    );

    await invalidateShoppingCache(roomId, finalPeriodId);

    return { success: true, shoppingItem };
  } catch (error: any) {
    console.error("Error creating shopping item:", error);
    return { success: false, message: error.message || "Failed to add shopping item" };
  }
}

export async function updateShoppingItemAction(itemId: string, groupId: string, updateData: any) {
  try {
    const userId = await getUserId();
    
    const currentItem = await prisma.shoppingItem.findUnique({
      where: { id: itemId },
      include: {
        room: {
          include: {
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!currentItem) return { success: false, message: "Item not found" };
    if (currentItem.room.members.length === 0) return { success: false, message: "Unauthorized" };

    const updatedItem = await ShoppingService.updateShoppingItem(itemId, updateData);
    await invalidateShoppingCache(currentItem.roomId, currentItem.periodId || undefined);

    return { success: true, shoppingItem: updatedItem };
  } catch (error: any) {
    console.error("Error updating shopping item:", error);
    return { success: false, message: error.message || "Failed to update shopping item" };
  }
}

export async function deleteShoppingItemAction(itemId: string, groupId: string) {
  try {
    const userId = await getUserId();
    
    const currentItem = await prisma.shoppingItem.findUnique({
      where: { id: itemId },
      include: {
        room: {
          include: {
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!currentItem) return { success: false, message: "Item not found" };
    if (currentItem.room.members.length === 0) return { success: false, message: "Unauthorized" };

    await ShoppingService.deleteShoppingItem(itemId);
    await invalidateShoppingCache(currentItem.roomId, currentItem.periodId || undefined);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting shopping item:", error);
    return { success: false, message: error.message || "Failed to delete shopping item" };
  }
}

export async function clearPurchasedShoppingItemsAction(groupId: string) {
  try {
    const userId = await getUserId();
    await validateMembership(userId, groupId);

    await prisma.shoppingItem.deleteMany({
      where: {
        roomId: groupId,
        purchased: true,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error clearing purchased items:", error);
    return { success: false, message: error.message || "Failed to clear purchased items" };
  }
}

export async function getShoppingListAction(
  roomId: string,
  options?: {
    periodId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }
) {
  try {
    const userId = await getUserId();
    await validateMembership(userId, roomId);

    const { periodId, startDate, endDate } = options || {};

    const { getPeriodAwareWhereClause } = await import("@/lib/utils/period-utils");
    const activePeriodFilter = !periodId ? await getPeriodAwareWhereClause(roomId, { roomId }) : null;

    let whereClause: any = { roomId };

    if (periodId) {
      whereClause.periodId = periodId;
    } else {
      if ((activePeriodFilter as any)?.id === null) {
        return { success: true, shoppingItems: [] };
      }
      whereClause = { ...activePeriodFilter };
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const { cacheGetOrSet } = await import("@/lib/cache/cache-service");
    const { getShoppingCacheKey, CACHE_TTL } = await import("@/lib/cache/cache-keys");
    const cacheKey = getShoppingCacheKey(roomId, periodId || (activePeriodFilter as any)?.id || 'active');

    const shoppingItems = await cacheGetOrSet(
      cacheKey,
      async () => {
        return await prisma.shoppingItem.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        });
      },
      { ttl: CACHE_TTL.MEALS_LIST }
    );

    return { success: true, shoppingItems };
  } catch (error: any) {
    console.error("Error fetching shopping items:", error);
    return { success: false, message: error.message || "Failed to fetch shopping items" };
  }
}

