'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
// Actions import removed
import { useRouter } from 'next/navigation';

interface JoinRequest {
  id: string;
  userId: string;
  roomId: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string; // Serialized date
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
}

export function JoinRequestsTab({ groupId, isAdmin, initialRequests = [] }: JoinRequestsTabProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Filter out any that might have been processed locally if we were using state, 
  // but since we rely on router.refresh(), initialRequests will update.
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
            {pendingRequests.map((request) => {
              const isProcessing = processingId === request.id;

              return (
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

                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleRequest(request.id, 'approve')}
                      disabled={isProcessing}
                    >
                      {isProcessing && actionType === 'approve' ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button

                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleRequest(request.id, 'reject')}
                      disabled={isProcessing}
                    >
                      {isProcessing && actionType === 'reject' ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      Reject
                    </Button>
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