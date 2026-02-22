"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { NotificationType } from "@prisma/client";
import { cacheGetOrSet } from "@/lib/cache/cache-service";

export async function getNotificationsAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized", notifications: [] };
    }

    const cacheKey = `notifications:${session.user.id}:list`;

    const notifications = await cacheGetOrSet(
      cacheKey,
      async () => {
        return await prisma.notification.findMany({
          where: {
            userId: session.user.id,
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
          orderBy: { createdAt: 'desc' },
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
      },
      { ttl: 30 }
    );

    return { success: true, notifications };
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return { success: false, message: "Failed to fetch notifications", notifications: [] };
  }
}

export async function createNotificationAction(userId: string, type: NotificationType, message: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    if (userId !== session.user.id) {
      return { success: false, message: "Unauthorized to create notification for this user" };
    }

    const now = new Date();
    const notification = {
      userId,
      type,
      message,
      read: false,
      createdAt: now,
      updatedAt: now
    };

    const result = await prisma.notification.create({ data: notification });
    return { success: true, notification: result };
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return { success: false, message: "Failed to create notification" };
  }
}

export async function markAsReadAction(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return { success: false, message: "Notification not found" };
    }

    if (notification.userId !== session.user.id) {
      return { success: false, message: "Unauthorized to modify this notification" };
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    return { success: true, notification: updated };
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { success: false, message: "Failed to mark notification as read" };
  }
}

export async function markAllAsReadAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, message: "Failed to mark all notifications as read" };
  }
}

export async function deleteNotificationAction(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return { success: false, message: "Notification not found" };
    }

    if (notification.userId !== session.user.id) {
      return { success: false, message: "Unauthorized to modify this notification" };
    }

    await prisma.notification.delete({
      where: { id }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return { success: false, message: "Failed to delete notification" };
  }
}
