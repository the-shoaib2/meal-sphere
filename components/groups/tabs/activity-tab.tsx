'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, UserMinus, Shield, Settings, MessageSquare, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityLog {
  id: string;
  type: string;
  details: any;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ActivityTabProps {
  groupId: string;
  isAdmin: boolean;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'MEMBER_JOINED':
    case 'MEMBER_ADDED':
      return <UserPlus className="h-4 w-4" />;
    case 'MEMBER_REMOVED':
    case 'MEMBER_BANNED':
      return <UserMinus className="h-4 w-4" />;
    case 'ROLE_CHANGED':
      return <Shield className="h-4 w-4" />;
    case 'SETTINGS_CHANGED':
      return <Settings className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const getActivityMessage = (log: ActivityLog) => {
  const { type, details, user } = log;
  
  switch (type) {
    case 'MEMBER_JOINED':
      return `${user.name} joined the group`;
    case 'MEMBER_ADDED':
      return `${user.name} added ${details.targetUserName} to the group`;
    case 'MEMBER_REMOVED':
      return `${user.name} removed ${details.targetUserName} from the group`;
    case 'MEMBER_BANNED':
      return `${user.name} banned ${details.targetUserName} from the group`;
    case 'ROLE_CHANGED':
      return `${user.name} changed ${details.targetUserName}'s role to ${details.newRole}`;
    case 'SETTINGS_CHANGED':
      return `${user.name} updated group settings`;
    default:
      return `${user.name} performed an action`;
  }
};

export function ActivityTab({ groupId, isAdmin }: ActivityTabProps) {
  const { data: logs, isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/activity`);
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return response.json();
    },
    enabled: isAdmin
  });

  if (!isAdmin) return null;
  if (error) return null;
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Activity Log</CardTitle>
          <CardDescription>Recent group activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!logs?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Activity Log</CardTitle>
          <CardDescription>No recent activity</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Activity Log</CardTitle>
        <CardDescription>Recent group activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 border rounded-lg"
            >
              <Avatar>
                <AvatarImage src={log.user.image || undefined} />
                <AvatarFallback>
                  {log.user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getActivityIcon(log.type)}
                  <p className="font-medium">{getActivityMessage(log)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 