'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface NotificationSettingsProps {
  groupId: string;
  isAdmin: boolean;
}

export function NotificationSettings({ groupId, isAdmin }: NotificationSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    groupMessages: true,
    announcements: true,
    mealUpdates: true,
    memberActivity: true,
    joinRequests: isAdmin,
  });
  const { toast } = useToast();

  const handleToggle = async (key: keyof typeof notifications) => {
    try {
      setIsLoading(true);
      const newValue = !notifications[key];
      
      // Update local state optimistically
      setNotifications(prev => ({
        ...prev,
        [key]: newValue
      }));

      // Make API call to update notification settings
      const response = await fetch(`/api/groups/${groupId}/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: newValue
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      toast({
        title: 'Success',
        description: `Notifications ${newValue ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      // Revert on error
      setNotifications(prev => ({
        ...prev,
        [key]: !notifications[key]
      }));

      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadAll = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage how you receive notifications for this group
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReadAll}
          disabled={isLoading}
          className="hidden sm:flex"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Mark All as Read
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="groupMessages">Group Messages</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when members send messages in the group
            </p>
          </div>
          <Switch
            id="groupMessages"
            checked={notifications.groupMessages}
            onCheckedChange={() => handleToggle('groupMessages')}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="announcements">Announcements</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when admins make announcements
            </p>
          </div>
          <Switch
            id="announcements"
            checked={notifications.announcements}
            onCheckedChange={() => handleToggle('announcements')}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="mealUpdates">Meal Updates</Label>
            <p className="text-sm text-muted-foreground">
              Get notified about meal planning and updates
            </p>
          </div>
          <Switch
            id="mealUpdates"
            checked={notifications.mealUpdates}
            onCheckedChange={() => handleToggle('mealUpdates')}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="memberActivity">Member Activity</Label>
            <p className="text-sm text-muted-foreground">
              Get notified about member joins and leaves
            </p>
          </div>
          <Switch
            id="memberActivity"
            checked={notifications.memberActivity}
            onCheckedChange={() => handleToggle('memberActivity')}
            disabled={isLoading}
          />
        </div>

        {isAdmin && (
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg sm:col-span-2">
            <div className="space-y-1">
              <Label htmlFor="joinRequests">Join Requests</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when users request to join the group
              </p>
            </div>
            <Switch
              id="joinRequests"
              checked={notifications.joinRequests}
              onCheckedChange={() => handleToggle('joinRequests')}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end sm:hidden">
        <Button
          variant="outline"
          onClick={handleReadAll}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Mark All as Read
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 