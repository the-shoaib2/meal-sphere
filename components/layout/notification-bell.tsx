"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellRing, X, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications, type Notification } from "@/contexts/notification-context"
import { formatDistanceToNow } from "date-fns"
import { SafeDate } from "@/components/shared/safe-date"
import { cn } from "@/lib/utils"

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
          <div className="rounded-full bg-blue-100 p-1.5 mr-2 group-hover:bg-blue-200 transition-colors">
            <Bell className="h-3.5 w-3.5 text-blue-600" />
          </div>
        )
      case "PAYMENT_DUE":
        return (
          <div className="rounded-full bg-red-100 p-1.5 mr-2 group-hover:bg-red-200 transition-colors">
            <Bell className="h-3.5 w-3.5 text-red-600" />
          </div>
        )
      case "VOTE_STARTED":
      case "VOTE_ENDED":
        return (
          <div className="rounded-full bg-green-100 p-1.5 mr-2 group-hover:bg-green-200 transition-colors">
            <Bell className="h-3.5 w-3.5 text-green-600" />
          </div>
        )
      case "MANAGER_CHANGED":
        return (
          <div className="rounded-full bg-purple-100 p-1.5 mr-2 group-hover:bg-purple-200 transition-colors">
            <Bell className="h-3.5 w-3.5 text-purple-600" />
          </div>
        )
      case "SHOPPING_ADDED":
        return (
          <div className="rounded-full bg-yellow-100 p-1.5 mr-2 group-hover:bg-yellow-200 transition-colors">
            <Bell className="h-3.5 w-3.5 text-yellow-600" />
          </div>
        )
      default:
        return (
          <div className="rounded-full bg-gray-100 p-1.5 mr-2 group-hover:bg-gray-200 transition-colors">
            <Bell className="h-3.5 w-3.5 text-gray-600" />
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
      <PopoverContent className="w-80 p-0 overflow-hidden" align="end" sideOffset={8}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 relative">
            <CardTitle className="text-lg">Notifications</CardTitle>
            <CardDescription className="text-xs">
              {safeNotifications.length > 0
                ? `You have ${safeNotifications.length} notification${safeNotifications.length !== 1 ? "s" : ""}`
                : "No notifications"}
            </CardDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 h-7 w-7 rounded-full hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Close</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {safeNotifications.length > 0 ? (
                <div className="flex flex-col">
                  {safeNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "group flex items-start gap-1 p-2.5 px-3 border-b last:border-0 transition-all duration-200 cursor-default hover:bg-muted/40",
                        !notification.read && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-tight break-words",
                          !notification.read ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <SafeDate
                            date={notification.createdAt}
                            format={(date) => formatDistanceToNow(date, { addSuffix: true })}
                          />
                          {!notification.read && (
                            <span className="h-1 w-1 rounded-full bg-primary" />
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete</span>
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
              <Button variant="outline" className="w-full" onClick={() => markAllAsRead()}>
                Mark all as read
              </Button>
            </CardFooter>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  )
}
