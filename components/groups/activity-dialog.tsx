'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface ActivityDialogProps {
    groupId: string;
    groupName: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isAdmin: boolean;
}

const getActivityIcon = (type: string) => {
    return <MessageSquare className="h-4 w-4" />;
};

const getActivityMessage = (log: ActivityLog) => {
    const { type, user } = log;
    return `${user.name} performed ${type.toLowerCase().replace(/_/g, ' ')}`;
};

export function ActivityDialog({ groupId, groupName, isOpen, onOpenChange, isAdmin }: ActivityDialogProps) {
    const { data: logs, isLoading, error } = useQuery<ActivityLog[]>({
        queryKey: ['activity-logs', groupId],
        queryFn: async () => {
            const response = await fetch(`/api/groups/${groupId}/activity`);
            if (!response.ok) throw new Error('Failed to fetch activity logs');
            return response.json();
        },
        enabled: isAdmin && isOpen // Only fetch when open and admin
    });

    if (!isAdmin) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Log
                    </DialogTitle>
                    <div className="text-sm text-muted-foreground">
                        Recent activities and events in {groupName}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            {isLoading ? (
                                [1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                ))
                            ) : error ? (
                                <div className="text-center py-8 text-destructive">Failed to load activity log</div>
                            ) : !logs?.length ? (
                                <div className="text-center py-8 text-muted-foreground">No recent activity</div>
                            ) : (
                                logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
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
                                                <p className="font-medium text-sm sm:text-base">{getActivityMessage(log)}</p>
                                            </div>

                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                        {Object.entries(log.details).map(([key, value]) => (
                                                            <Badge key={key} variant="outline" className="text-xs font-normal">
                                                                {key.replace(/_/g, ' ')}: {String(value)}
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
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
