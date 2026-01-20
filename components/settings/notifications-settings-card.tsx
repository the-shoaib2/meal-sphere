"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Bell, Check, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

type GlobalSettings = {
    mealReminders: boolean
    paymentAlerts: boolean
    votingNotifications: boolean
    managerUpdates: boolean
    shoppingAlerts: boolean
    emailNotifications: boolean
}

export function NotificationsSettingsCard() {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
        mealReminders: true,
        paymentAlerts: true,
        votingNotifications: true,
        managerUpdates: true,
        shoppingAlerts: true,
        emailNotifications: false,
    })

    const handleGlobalToggle = useCallback((setting: keyof GlobalSettings) => {
        setGlobalSettings(prev => ({
            ...prev,
            [setting]: !prev[setting],
        }))
    }, [])

    const handleSaveGlobalSettings = useCallback(async () => {
        try {
            setIsLoading(true)
            // This would be replaced with an actual API call to save global settings
            const response = await fetch('/api/settings/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(globalSettings)
            })

            if (!response.ok) {
                throw new Error('Failed to save settings')
            }

            toast({
                title: "Settings saved",
                description: "Your global notification preferences have been updated",
                action: <Check className="h-4 w-4" />,
            })
        } catch (error) {
            console.error('Error saving settings:', error)
            toast({
                title: 'Error',
                description: 'Failed to save notification settings',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [globalSettings])

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
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
                <Button className="w-full" onClick={handleSaveGlobalSettings} disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save Global Preferences'
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
