'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, UserPlus, UserMinus, Shield, Settings, MessageSquare, History, Link, Clock } from 'lucide-react';
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
  // Default icon for any activity type
  return <MessageSquare className="h-4 w-4" />;
};

const getActivityMessage = (log: ActivityLog) => {
  const { type, details, user } = log;
  
  // Return a generic message that works for any activity type
  return `${user.name} performed ${type.toLowerCase().replace(/_/g, ' ')}`;
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
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 pr-4">
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
                  
                  {/* Show all details dynamically for any activity type */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {Object.entries(log.details).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 