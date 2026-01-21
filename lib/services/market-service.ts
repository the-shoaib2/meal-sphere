import { prisma } from '@/lib/services/prisma';
import { createNotification } from "@/lib/utils/notification-utils";
import { NotificationType } from "@prisma/client";
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';

export async function fetchMarketDates(roomId: string, userId: string) {
    const cacheKey = `market-dates-${roomId}`;
    
    const cachedFn = unstable_cache(
        async () => {
             // Check if user is a member (simple check or assume caller checked?)
             // API line 116 checks checks user->rooms->where roomId.
             // We'll trust the caller handles Auth context, but we should verify access to roomId.
             const membership = await prisma.roomMember.findUnique({
                 where: { userId_roomId: { userId, roomId } }
             });
             if (!membership) throw new Error("Unauthorized");

             const marketDates = await prisma.marketDate.findMany({
                 where: { roomId },
                 include: {
                     user: {
                         select: {
                             id: true, name: true, email: true, image: true
                         }
                     }
                 },
                 orderBy: { date: 'desc' }
             });
             
             return encryptData(marketDates);
        },
        [cacheKey, 'market-dates'],
        {
            revalidate: 60,
            tags: [`group-${roomId}`, 'market-dates']
        }
    );

    const encrypted = await cachedFn();
    return decryptData(encrypted);
}

export async function assignMarketDate(data: { roomId: string; userId: string; assignedUserId: string; date: Date }) {
    const { roomId, userId, assignedUserId, date } = data;

    // Check if user (assigner) is MANAGER or ADMIN
    const assignerMembership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId } }
    });
    
    if (!assignerMembership || (assignerMembership.role !== 'MANAGER' && assignerMembership.role !== 'ADMIN')) {
         throw new Error("Unauthorized: Only Managers/Admins can assign market dates");
    }

    // Check if assigned user is member
    const assignedUserMember = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: assignedUserId, roomId } },
        include: { user: true }
    });

    if (!assignedUserMember) {
        throw new Error("Assigned user is not a member of this room");
    }

    const marketDate = await prisma.marketDate.create({
        data: {
            date,
            userId: assignedUserId,
            roomId
        }
    });

    // Notify
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { name: true } });
    
    await createNotification({
        userId: assignedUserId,
        type: NotificationType.MEMBER_ADDED, // Reusing existing type per API logic or use correct type
        // The API uses MEMBER_ADDED?? Line 86: type: NotificationType.MEMBER_ADDED. That looks weird but I'll stick to it or use GENERAL.
        message: `You have been assigned market duty for ${room?.name} on ${date.toLocaleDateString()}.`
    });

    revalidateTag(`group-${roomId}`);
    revalidateTag('market-dates');

    return marketDate;
}
