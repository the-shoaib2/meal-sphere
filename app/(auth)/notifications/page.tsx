"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/contexts/notification-context"
import { Bell, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function NotificationsPage() {
  const { notifications, markAllAsRead } = useNotifications()
  const [settings, setSettings] = useState({
    mealReminders: true,
    paymentAlerts: true,
    votingNotifications: true,
    managerUpdates: true,
    shoppingAlerts: true,
    emailNotifications: false,
  })

  const handleToggle = (setting: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  const handleSaveSettings = () => {
    // This would be replaced with an actual API call to save settings
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated",
      action: <Check className="h-4 w-4" />,
    })
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">Manage your notification preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose which notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="meal-reminders">Meal Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive reminders to mark your daily meals</p>
              </div>
              <Switch
                id="meal-reminders"
                checked={settings.mealReminders}
                onCheckedChange={() => handleToggle("mealReminders")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payment-alerts">Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified about payment due dates and confirmations</p>
              </div>
              <Switch
                id="payment-alerts"
                checked={settings.paymentAlerts}
                onCheckedChange={() => handleToggle("paymentAlerts")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voting-notifications">Voting Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates about active votes and results</p>
              </div>
              <Switch
                id="voting-notifications"
                checked={settings.votingNotifications}
                onCheckedChange={() => handleToggle("votingNotifications")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="manager-updates">Manager Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified when room managers change</p>
              </div>
              <Switch
                id="manager-updates"
                checked={settings.managerUpdates}
                onCheckedChange={() => handleToggle("managerUpdates")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shopping-alerts">Shopping Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive notifications when new shopping items are added</p>
              </div>
              <Switch
                id="shopping-alerts"
                checked={settings.shoppingAlerts}
                onCheckedChange={() => handleToggle("shoppingAlerts")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email in addition to in-app alerts
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={() => handleToggle("emailNotifications")}
              />
            </div>
            <Button className="w-full" onClick={handleSaveSettings}>
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Center</CardTitle>
            <CardDescription>
              You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start ${!notification.read ? "bg-muted/50 -mx-2 p-2 rounded-md" : ""}`}
                  >
                    <div className="rounded-full bg-primary/10 p-2 mr-3">
                      <Bell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground">
                    + {notifications.length - 5} more notifications
                  </p>
                )}
                <Button variant="outline" className="w-full" onClick={() => markAllAsRead()}>
                  Mark all as read
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
