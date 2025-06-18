"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/contexts/notification-context"
import { Bell, Check, Loader2, BellOff, Users, MessageSquare, Megaphone, Utensils, UserPlus, Settings } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useGroups } from "@/hooks/use-groups"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function NotificationsPage() {
  const { notifications, markAllAsRead } = useNotifications()
  const { data: groups = [] } = useGroups()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("global")

  // Global notification settings
  const [globalSettings, setGlobalSettings] = useState({
    mealReminders: true,
    paymentAlerts: true,
    votingNotifications: true,
    managerUpdates: true,
    shoppingAlerts: true,
    emailNotifications: false,
  })

  // Group-specific notification settings
  const [groupSettings, setGroupSettings] = useState<Record<string, {
    groupMessages: boolean;
    announcements: boolean;
    mealUpdates: boolean;
    memberActivity: boolean;
    joinRequests: boolean;
  }>>({})

  // Initialize group settings when groups data loads
  useEffect(() => {
    const initialGroupSettings: Record<string, any> = {}
    groups.forEach(group => {
      initialGroupSettings[group.id] = {
        groupMessages: true,
        announcements: true,
        mealUpdates: true,
        memberActivity: true,
        joinRequests: group.role === 'ADMIN' || group.role === 'MANAGER',
      }
    })
    setGroupSettings(initialGroupSettings)
  }, [groups])

  const handleGlobalToggle = (setting: keyof typeof globalSettings) => {
    setGlobalSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  const handleGroupToggle = async (groupId: string, key: string) => {
    try {
      setIsLoading(true)
      const newValue = !groupSettings[groupId]?.[key as keyof typeof groupSettings[typeof groupId]]
      
      // Update local state optimistically
      setGroupSettings(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          [key]: newValue
        }
      }))

      // Make API call to update notification settings
      const response = await fetch(`/api/groups/${groupId}/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: newValue
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update notification settings')
      }

      toast({
        title: 'Success',
        description: `Notifications ${newValue ? 'enabled' : 'disabled'} successfully`,
      })
    } catch (error) {
      // Revert on error
      setGroupSettings(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          [key]: !groupSettings[groupId]?.[key as keyof typeof groupSettings[typeof groupId]]
        }
      }))

      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReadAll = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      markAllAsRead()
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveGlobalSettings = () => {
    // This would be replaced with an actual API call to save global settings
    toast({
      title: "Settings saved",
      description: "Your global notification preferences have been updated",
      action: <Check className="h-4 w-4" />,
    })
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">Manage your notification preferences across all groups</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Global Settings
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Global Notification Preferences
                </CardTitle>
                <CardDescription>Choose which notifications you want to receive across all groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="meal-reminders">Meal Reminders</Label>
                    <p className="text-sm text-muted-foreground">Receive reminders to mark your daily meals</p>
                  </div>
                  <Switch
                    id="meal-reminders"
                    checked={globalSettings.mealReminders}
                    onCheckedChange={() => handleGlobalToggle("mealReminders")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="payment-alerts">Payment Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified about payment due dates and confirmations</p>
                  </div>
                  <Switch
                    id="payment-alerts"
                    checked={globalSettings.paymentAlerts}
                    onCheckedChange={() => handleGlobalToggle("paymentAlerts")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="voting-notifications">Voting Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates about active votes and results</p>
                  </div>
                  <Switch
                    id="voting-notifications"
                    checked={globalSettings.votingNotifications}
                    onCheckedChange={() => handleGlobalToggle("votingNotifications")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="manager-updates">Manager Updates</Label>
                    <p className="text-sm text-muted-foreground">Get notified when room managers change</p>
                  </div>
                  <Switch
                    id="manager-updates"
                    checked={globalSettings.managerUpdates}
                    onCheckedChange={() => handleGlobalToggle("managerUpdates")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="shopping-alerts">Shopping Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications when new shopping items are added</p>
                  </div>
                  <Switch
                    id="shopping-alerts"
                    checked={globalSettings.shoppingAlerts}
                    onCheckedChange={() => handleGlobalToggle("shoppingAlerts")}
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
                    checked={globalSettings.emailNotifications}
                    onCheckedChange={() => handleGlobalToggle("emailNotifications")}
                  />
                </div>
                <Button className="w-full" onClick={handleSaveGlobalSettings}>
                  Save Global Preferences
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Center
                </CardTitle>
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
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleReadAll}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <BellOff className="h-4 w-4 mr-2" />
                          Mark all as read
                        </>
                      )}
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Group Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Manage notification preferences for each group you're a member of
              </p>
            </div>
          </div>

          {groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[200px] text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">You're not a member of any groups yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <CardDescription>{group.description || 'No description'}</CardDescription>
                      </div>
                      <Badge variant={group.role === 'ADMIN' || group.role === 'MANAGER' ? 'default' : 'secondary'}>
                        {group.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`${group.id}-messages`}>Group Messages</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when members send messages
                        </p>
                      </div>
                      <Switch
                        id={`${group.id}-messages`}
                        checked={groupSettings[group.id]?.groupMessages ?? true}
                        onCheckedChange={() => handleGroupToggle(group.id, 'groupMessages')}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`${group.id}-announcements`}>Announcements</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when admins make announcements
                        </p>
                      </div>
                      <Switch
                        id={`${group.id}-announcements`}
                        checked={groupSettings[group.id]?.announcements ?? true}
                        onCheckedChange={() => handleGroupToggle(group.id, 'announcements')}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`${group.id}-meals`}>Meal Updates</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified about meal planning and updates
                        </p>
                      </div>
                      <Switch
                        id={`${group.id}-meals`}
                        checked={groupSettings[group.id]?.mealUpdates ?? true}
                        onCheckedChange={() => handleGroupToggle(group.id, 'mealUpdates')}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`${group.id}-activity`}>Member Activity</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified about member joins and leaves
                        </p>
                      </div>
                      <Switch
                        id={`${group.id}-activity`}
                        checked={groupSettings[group.id]?.memberActivity ?? true}
                        onCheckedChange={() => handleGroupToggle(group.id, 'memberActivity')}
                        disabled={isLoading}
                      />
                    </div>

                    {(group.role === 'ADMIN' || group.role === 'MANAGER') && (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor={`${group.id}-requests`}>Join Requests</Label>
                          <p className="text-xs text-muted-foreground">
                            Get notified when users request to join
                          </p>
                        </div>
                        <Switch
                          id={`${group.id}-requests`}
                          checked={groupSettings[group.id]?.joinRequests ?? true}
                          onCheckedChange={() => handleGroupToggle(group.id, 'joinRequests')}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
