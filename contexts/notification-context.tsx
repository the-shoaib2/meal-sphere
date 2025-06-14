"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"
import { Bell } from "lucide-react"

export type Notification = {
  id: string
  type:
    | "MEAL_REMINDER"
    | "PAYMENT_DUE"
    | "VOTE_STARTED"
    | "VOTE_ENDED"
    | "MANAGER_CHANGED"
    | "SHOPPING_ADDED"
    | "CUSTOM"
  message: string
  read: boolean
  createdAt: string
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

  const fetchNotifications = async () => {
    if (status === 'loading' || !session?.user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) throw new Error("Failed to fetch notifications")

      const data = await response.json()
      setNotifications(data)
      setUnreadCount(data.filter((notif: Notification) => !notif.read).length)
      setLastFetched(new Date())
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (id: string) => {
    if (!session?.user) return

    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
      })

      if (!response.ok) throw new Error("Failed to mark notification as read")

      setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!session?.user) return

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
      })

      if (!response.ok) throw new Error("Failed to mark all notifications as read")

      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!session?.user) return

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete notification")

      const updatedNotifications = notifications.filter((notif) => notif.id !== id)
      setNotifications(updatedNotifications)
      setUnreadCount(updatedNotifications.filter((notif) => !notif.read).length)
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoading(true)
      fetchNotifications().finally(() => setIsLoading(false))
      // Set up polling every 60 seconds
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [session, status])

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
          action: <Bell className="h-4 w-4" />,
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
    case "MEAL_REMINDER":
      return "Meal Reminder"
    case "PAYMENT_DUE":
      return "Payment Due"
    case "VOTE_STARTED":
      return "New Vote Started"
    case "VOTE_ENDED":
      return "Vote Ended"
    case "MANAGER_CHANGED":
      return "Manager Changed"
    case "SHOPPING_ADDED":
      return "Shopping Added"
    case "CUSTOM":
      return "Notification"
    default:
      return "Notification"
  }
}
