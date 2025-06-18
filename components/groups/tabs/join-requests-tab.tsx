'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, UserPlus, Shield, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Role } from '@prisma/client';

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
  userRole: Role | null;
  onRequestProcessed?: () => void;
}

export function JoinRequestsTab({ groupId, userRole, onRequestProcessed }: JoinRequestsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Check if user can manage join requests (only ADMIN and MANAGER)
  const canManageRequests = userRole === Role.ADMIN || userRole === Role.MANAGER;

  // Fetch join requests
  const { data: requests, isLoading: isLoadingRequests } = useQuery<{ success: boolean; data: JoinRequest[] }>({
    queryKey: ['join-requests', groupId],
    queryFn: async () => {
      // Only fetch if user can manage requests
      if (!canManageRequests) {
        return { success: true, data: [] };
      }
      
      const response = await fetch(`/api/groups/${groupId}/join-requests`);
      if (!response.ok) {
        throw new Error('Failed to fetch join requests');
      }
      return response.json();
    }
  });

  // Debug logging
  console.log('JoinRequestsTab debug:', {
    userRole,
    canManageRequests,
    groupId,
    requestsCount: requests?.data?.length || 0
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process request');
      }

      toast.success(`Request ${action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      // Also invalidate group data to refresh member count
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      onRequestProcessed?.();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canManageRequests) {
    return null;
  }

  if (isLoadingRequests) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Join Requests</CardTitle>
          </div>
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

  const joinRequests = requests?.data || [];
  const pendingRequests = joinRequests.filter(r => r.status === 'PENDING');
  const approvedRequests = joinRequests.filter(r => r.status === 'APPROVED');
  const rejectedRequests = joinRequests.filter(r => r.status === 'REJECTED');

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Join Requests</CardTitle>
          </div>
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
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Join Requests</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {userRole === Role.ADMIN && (
              <Badge variant="default" className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Admin
              </Badge>
            )}
            {userRole === Role.MANAGER && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Manager
              </Badge>
            )}
            <Badge variant="outline">
              {pendingRequests.length} pending
            </Badge>
          </div>
        </div>
        <CardDescription>
          Manage join requests for your private group. Only admins and managers can approve or reject requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {joinRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No join requests found
          </p>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  Pending Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/20"
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
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleRequest(request.id, 'approve')}
                          disabled={isLoading}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              </div>
            )}

            {/* Approved Requests */}
            {approvedRequests.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  Approved Requests ({approvedRequests.length})
                </h3>
                <div className="space-y-4">
                  {approvedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20"
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
                            Approved {formatDistanceToNow(new Date(request.updatedAt))} ago
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Requests */}
            {rejectedRequests.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  Rejected Requests ({rejectedRequests.length})
                </h3>
                <div className="space-y-4">
                  {rejectedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-red-50 dark:bg-red-950/20"
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
                            Rejected {formatDistanceToNow(new Date(request.updatedAt))} ago
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 