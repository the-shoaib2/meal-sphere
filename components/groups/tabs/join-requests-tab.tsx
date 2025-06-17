'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface JoinRequest {
  id: string;
  userId: string;
  roomId: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
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
}

export function JoinRequestsTab({ groupId, isAdmin }: JoinRequestsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch join requests
  const { data: requests, isLoading: isLoadingRequests } = useQuery<JoinRequest[]>({
    queryKey: ['join-requests', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/join-requests`);
      if (!response.ok) {
        throw new Error('Failed to fetch join requests');
      }
      return response.json();
    },
    enabled: isAdmin
  });

  // Handle request approval/rejection
  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/groups/${groupId}/join-request/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Failed to process request');
      }

      toast.success(`Request ${action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoadingRequests) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Join Requests</CardTitle>
          <CardDescription>Loading join requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'PENDING') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Join Requests</CardTitle>
          <CardDescription>Manage join requests for your group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Join Requests</CardTitle>
            <CardDescription>
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {pendingRequests.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending join requests
          </p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border"
              >
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={request.user.image || undefined} />
                    <AvatarFallback>
                      {request.user.name?.[0] || request.user.email?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {request.user.name || request.user.email}
                    </p>
                    {request.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {formatDistanceToNow(new Date(request.createdAt))} ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleRequest(request.id, 'approve')}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleRequest(request.id, 'reject')}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 