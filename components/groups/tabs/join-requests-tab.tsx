'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, UserPlus, Activity, RefreshCcw, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface JoinRequest {
  id: string;
  userId: string;
  roomId: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface JoinRequestsTabProps {
  groupId: string;
  isAdmin: boolean;
  initialRequests?: JoinRequest[];
  isLoading?: boolean;
}

export function JoinRequestsTab({ groupId, isAdmin, initialRequests = [], isLoading = false }: JoinRequestsTabProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const pendingRequests = initialRequests?.filter(r => r.status === 'PENDING') || [];

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(requestId);
      setActionType(action);

      const response = await fetch(`/api/groups/${groupId}/join-request/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to process request');
      }

      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected');
      router.refresh();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="space-y-4 min-h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">
            Join Requests
          </CardTitle>
          <CardDescription>
            {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''} awaiting your review
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCcw className={cn("h-4 w-4 mr-2", (isRefreshing || isLoading) && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {(isLoading || isRefreshing) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Loader className="h-8 w-8 animate-spin mb-4 text-primary/60" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed">
            <UserPlus className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-base font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              There are no pending join requests for this group right now.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {pendingRequests.map((request, index) => {
              const isProcessing = processingId === request.id;

              return (
                <div key={request.id}>
                  {index > 0 && <Separator />}
                  <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-all hover:bg-muted/30",
                    isProcessing && "opacity-50 pointer-events-none"
                  )}>
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <Avatar className="h-12 w-12 border shadow-sm shrink-0">
                        <AvatarImage src={request.user.image || ''} alt={request.user.name || "User avatar"} />
                        <AvatarFallback className="bg-primary/5 text-primary font-medium">
                          {request.user.name?.[0]?.toUpperCase() || request.user.email?.[0]?.toUpperCase() || <UserPlus className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base truncate">{request.user.name || 'Anonymous User'}</span>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-4 px-1.5 shrink-0 bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400 dark:border-yellow-500/40">
                            Pending
                          </Badge>
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground gap-3 mt-0.5">
                          <span className="truncate font-semibold ">{request.user.email}</span>
                          <span className="hidden sm:inline-block">•</span>
                          <span className="shrink-0 flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {request.message && !['Invited via token', 'Joined with password'].includes(request.message) && (
                      <div className="hidden lg:flex flex-1 items-center px-4">
                        <div className="text-sm text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border text-center w-full truncate" title={request.message}>
                          <span className="text-foreground/70 font-medium mr-1 border-r border-border/50 pr-2 inline-block">Message</span>
                          <span className="italic">"{request.message}"</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 sm:shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 sm:flex-none rounded-full bg-green-500/15 text-green-700 hover:bg-green-500/25 hover:text-green-800 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300 transition-colors"
                        onClick={() => handleRequest(request.id, 'approve')}
                        disabled={isProcessing}
                      >
                        {isProcessing && actionType === 'approve' ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 sm:flex-none rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors"
                        onClick={() => handleRequest(request.id, 'reject')}
                        disabled={isProcessing}
                      >
                        {isProcessing && actionType === 'reject' ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1.5" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}