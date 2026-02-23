import { prisma } from '@/lib/services/prisma';
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache';
const revalidateTag = _revalidateTag as any;
import { encryptData, decryptData } from '@/lib/encryption';
import { cacheDelete } from '@/lib/cache/cache-service';
import { NotificationType } from '@prisma/client';

export async function fetchNotifications(userId: string) {
  const cacheKey = `notifications-${userId}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          type: {
            in: [
              NotificationType.MEMBER_ADDED,
              NotificationType.MEMBER_REMOVED,
              NotificationType.MEAL_CREATED,
              NotificationType.MEAL_UPDATED,
              NotificationType.MEAL_DELETED,
              NotificationType.PAYMENT_CREATED,
              NotificationType.PAYMENT_UPDATED,
              NotificationType.PAYMENT_DELETED,
              NotificationType.JOIN_REQUEST_APPROVED,
              NotificationType.JOIN_REQUEST_REJECTED
            ]
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50,
        select: {
          id: true,
          type: true,
          message: true,
          read: true,
          createdAt: true,
          userId: true
        }
      });
      
      return encryptData(notifications);
    },
    [cacheKey, 'notifications-list'],
    { 
      revalidate: 30, 
      tags: [`user-${userId}`, 'notifications'] 
    }
  );

  const encrypted = await cachedFn();
  return decryptData(encrypted);
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    });

    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== userId) throw new Error("Unauthorized");

    const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
    });

    // Invalidate
    await cacheDelete(`notifications:${userId}:list`); // Legacy cache support if needed
    revalidateTag(`user-${userId}`);
    revalidateTag('notifications');

    return updated;
}

export async function markAllNotificationsAsRead(userId: string) {
    await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
    });

    // Invalidate
    await cacheDelete(`notifications:${userId}:list`);
    revalidateTag(`user-${userId}`);
    revalidateTag('notifications');

    return { success: true };
}

export async function deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    });

    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== userId) throw new Error("Unauthorized");

    await prisma.notification.delete({
        where: { id: notificationId }
    });

    // Invalidate
    await cacheDelete(`notifications:${userId}:list`);
    revalidateTag(`user-${userId}`, 'max');
    revalidateTag('notifications', 'max');

    return { success: true };
}
