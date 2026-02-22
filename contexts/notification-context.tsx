"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"
import { Bell } from "lucide-react"

import { NotificationType } from "@prisma/client"

export type Notification = {
  id: string
  type: NotificationType | "CUSTOM"
  message: string
  read: boolean
  createdAt: string | Date
}

type NotificationContextType = {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = async (signal?: AbortSignal) => {
    if (status !== 'authenticated' || !session?.user) {
      if (status !== 'loading') setIsLoading(false)
      return
    }

    try {
      const { getNotificationsAction } = await import('@/lib/actions/notification.actions');
      const res = await getNotificationsAction();
      if (!res.success) {
        if (res.message === "Unauthorized") return;
        throw new Error(`Failed to fetch notifications: ${res.message}`);
      }

      const data: Notification[] = res.notifications as unknown as Notification[];

      // Ensure unique notifications by ID to prevent React key errors
      const uniqueNotifications = Array.isArray(data)
        ? data.filter((notification: Notification, index: number, self: Notification[]) =>
          index === self.findIndex((n) => n.id === notification.id)
        )
        : [];

      setNotifications(uniqueNotifications)
      setUnreadCount(uniqueNotifications.filter((notif: Notification) => !notif.read).length)
      setLastFetched(new Date())
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.warn("Could not fetch notifications (possibly server restart):", error.message)
    }
  }

  const markAsRead = async (id: string) => {
    if (!session?.user) return

    try {
      const { markAsReadAction } = await import('@/lib/actions/notification.actions');
      const res = await markAsReadAction(id);

      if (!res.success) throw new Error("Failed to mark notification as read");

      setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!session?.user) return

    try {
      const { markAllAsReadAction } = await import('@/lib/actions/notification.actions');
      const res = await markAllAsReadAction();

      if (!res.success) throw new Error("Failed to mark all notifications as read");

      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!session?.user) return

    try {
      const { deleteNotificationAction } = await import('@/lib/actions/notification.actions');
      const res = await deleteNotificationAction(id);

      if (!res.success) throw new Error("Failed to delete notification");

      const updatedNotifications = notifications.filter((notif) => notif.id !== id)
      setNotifications(updatedNotifications)
      setUnreadCount(updatedNotifications.filter((notif) => !notif.read).length)
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const initialFetchRef = useRef(false);

  // Initial fetch when the component mounts and session is authenticated
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchInitialNotifications = async () => {
      if (status === 'authenticated' && !initialFetchRef.current) {
        initialFetchRef.current = true;
        setIsLoading(true);
        try {
          await fetchNotifications(controller.signal);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    fetchInitialNotifications();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      if (status === 'authenticated') {
        fetchNotifications(controller.signal);
      }
    }, 30000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [status]); // Only depend on status, not session or notifications

  // Show toast for new notifications
  useEffect(() => {
    if (lastFetched && notifications.length > 0) {
      const newestNotification = notifications[0]
      const notifDate = new Date(newestNotification.createdAt)

      // Only show toast for notifications that are newer than our last fetch
      // and only on subsequent fetches (not the first load)
      if (lastFetched && notifDate > lastFetched && !newestNotification.read) {
        toast({
          title: getNotificationTitle(newestNotification.type),
          description: newestNotification.message,
        })
      }
    }
  }, [notifications, lastFetched])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

// Helper function to get notification title based on type
function getNotificationTitle(type: Notification["type"]): string {
  switch (type) {
    case "MEAL_CREATED":
    case "MEAL_UPDATED":
      return "Meal Update"
    case "MEAL_DELETED":
      return "Meal Cancelled"
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
      return "Payment Update"
    case "PAYMENT_DELETED":
      return "Payment Cancelled"
    case "MEMBER_ADDED":
      return "New Member Joined"
    case "MEMBER_REMOVED":
      return "Member Left"
    case "JOIN_REQUEST_APPROVED":
      return "Request Approved"
    case "JOIN_REQUEST_REJECTED":
      return "Request Rejected"
    case "CUSTOM":
      return "Notification"
    default:
      return "Notification"
  }
}
