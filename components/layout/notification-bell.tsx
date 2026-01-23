"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellRing } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications, type Notification } from "@/contexts/notification-context"
import { formatDistanceToNow } from "date-fns"
import { SafeDate } from "@/components/shared/safe-date"

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [open, setOpen] = useState(false)

  // Ensure notifications is always an array
  const safeNotifications = Array.isArray(notifications) ? notifications : []

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    // Mark notifications as read when opening the popover
    if (newOpen && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "MEAL_REMINDER":
        return (
          <div className="rounded-full bg-blue-100 p-2 mr-3">
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
        )
      case "PAYMENT_DUE":
        return (
          <div className="rounded-full bg-red-100 p-2 mr-3">
            <Bell className="h-4 w-4 text-red-600" />
          </div>
        )
      case "VOTE_STARTED":
      case "VOTE_ENDED":
        return (
          <div className="rounded-full bg-green-100 p-2 mr-3">
            <Bell className="h-4 w-4 text-green-600" />
          </div>
        )
      case "MANAGER_CHANGED":
        return (
          <div className="rounded-full bg-purple-100 p-2 mr-3">
            <Bell className="h-4 w-4 text-purple-600" />
          </div>
        )
      case "SHOPPING_ADDED":
        return (
          <div className="rounded-full bg-yellow-100 p-2 mr-3">
            <Bell className="h-4 w-4 text-yellow-600" />
          </div>
        )
      default:
        return (
          <div className="rounded-full bg-gray-100 p-2 mr-3">
            <Bell className="h-4 w-4 text-gray-600" />
          </div>
        )
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild suppressHydrationWarning>
        <Button variant="ghost" size="icon" className="relative group rounded-lg active:scale-95">
          {unreadCount > 0 ? (
            <div className="relative">
              <BellRing className={`h-5 w-5 text-primary ${!open ? 'animate-pulse' : ''}`} />
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground ring-2 ring-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              {safeNotifications.length > 0
                ? `You have ${safeNotifications.length} notification${safeNotifications.length !== 1 ? "s" : ""}`
                : "No notifications"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] px-4">
              {safeNotifications.length > 0 ? (
                <div className="space-y-4 py-2">
                  {safeNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start ${!notification.read ? "bg-muted/50 -mx-2 p-2 rounded-md" : ""}`}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          <SafeDate
                            date={notification.createdAt}
                            format={(date) => formatDistanceToNow(date, { addSuffix: true })}
                          />
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-8 w-8 p-0"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <span className="sr-only">Delete</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          {safeNotifications.length > 0 && (
            <CardFooter className="border-t p-4">
              <Button variant="outline" size="sm" className="w-full" onClick={() => markAllAsRead()}>
                Mark all as read
              </Button>
            </CardFooter>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  )
}
