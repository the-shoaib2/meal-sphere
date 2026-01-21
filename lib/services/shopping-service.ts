import { prisma } from '@/lib/services/prisma';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { getShoppingCacheKey, CACHE_TTL } from "@/lib/cache/cache-keys";
import { invalidateShoppingCache } from "@/lib/cache/cache-invalidation";
import { notifyRoomMembersBatch } from "@/lib/utils/notification-utils";
import { NotificationType } from "@prisma/client";
import { addPeriodIdToData, getPeriodAwareWhereClause } from "@/lib/utils/period-utils";
import { uploadReceipt } from "@/lib/utils/upload-utils";

export async function fetchShoppingData(userId: string, roomId: string, periodId?: string, startDate?: string, endDate?: string) {
    const cacheKey = `shopping-data-${roomId}-${periodId || 'active'}`;

    const cachedFn = unstable_cache(
        async () => {
            // Check membership
            const member = await prisma.roomMember.findUnique({
                where: { userId_roomId: { userId, roomId } },
                include: { room: true }
            });
            if (!member) throw new Error("Unauthorized"); // Or handle gracefully

             // Logic to resolve period and whereClause
            let whereClause: any = { roomId };
            let currentPeriod = null;

            if (periodId) {
                whereClause.periodId = periodId;
                currentPeriod = await prisma.mealPeriod.findUnique({ where: { id: periodId } });
            } else {
                 // Determine active period
                 currentPeriod = await prisma.mealPeriod.findFirst({
                     where: { roomId, status: 'ACTIVE' }
                 });
                 
                 // If no active period, we might return empty list or specific state
                 if (!currentPeriod && member.room.periodMode === 'MONTHLY') {
                     // In monthly mode, maybe we strictly need a period. 
                     // But for shopping, we might allow viewing history via date range even without active period??
                     // The page handles (!shoppingData.currentPeriod) by showing NoPeriodState.
                 }

                 if (currentPeriod) {
                     whereClause.periodId = currentPeriod.id;
                 } else {
                     // If strict period mode and no period, return empty or Indicate no period
                 }
            }

            if (startDate && endDate) {
                whereClause.date = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            // Fetch Items
            const items = await prisma.shoppingItem.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, image: true }
                    }
                },
                orderBy: { date: 'desc' }
            });

            return encryptData({
                items,
                currentPeriod,
                roomData: {
                    periodMode: member.room.periodMode,
                    isPrivate: member.room.isPrivate
                }
            });
        },
        [cacheKey, 'shopping-data'],
        {
            revalidate: 120, 
            tags: [`group-${roomId}`, `shopping-${roomId}`]
        }
    );

    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

export async function createShoppingItem(userId: string, roomId: string, data: { description: string, amount: number, date: Date, receiptUrl?: string | null, periodId: string }) {
    const { description, amount, date, receiptUrl, periodId } = data;

    const item = await prisma.shoppingItem.create({
        data: {
            name: description.substring(0, 50) || 'Shopping Item',
            description,
            quantity: amount,
            date,
            receiptUrl,
            userId,
            roomId,
            periodId
        }
    });

    return item;
}

export async function updateShoppingItem(itemId: string, updateData: any) {
    const allowedUpdates = ['name', 'quantity', 'unit', 'purchased'];
    const filteredUpdates: any = {};
    Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) filteredUpdates[key] = updateData[key];
    });

    const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: filteredUpdates,
        include: { user: { select: { id: true, name: true, email: true, image: true } } }
    });

    return updatedItem;
}

export async function deleteShoppingItem(itemId: string) {
    await prisma.shoppingItem.delete({ where: { id: itemId } });
    return { success: true };
}
