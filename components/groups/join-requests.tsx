import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequest {
  id: string;
  status: string;
  message?: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface JoinRequestsProps {
  groupId: string;
  isAdmin: boolean;
}

export function JoinRequests({ groupId, isAdmin }: JoinRequestsProps) {
  const queryClient = useQueryClient();
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const { data, isLoading, error } = useQuery<JoinRequest[]>({
    queryKey: ['join-requests', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/join-request`);
      if (!response.ok) throw new Error('Failed to fetch join requests');
      return response.json();
    },
    enabled: isAdmin
  });

  const updateRequest = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: 'APPROVED' | 'REJECTED' }) => {
      const response = await fetch(`/api/groups/${groupId}/join-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    }
  });

  useEffect(() => {
    if (data) setRequests(data);
  }, [data]);

  if (!isAdmin) return null;
  if (error) return null;
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join Requests</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join Requests</CardTitle>
          <CardDescription>No pending requests</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Requests</CardTitle>
        <CardDescription>Manage requests to join your group</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={request.user.image || undefined} />
                  <AvatarFallback>
                    {request.user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{request.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.user.email}
                  </p>
                  {request.message && (
                    <p className="text-sm mt-1">{request.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateRequest.mutate(
                      { requestId: request.id, status: 'APPROVED' },
                      {
                        onSuccess: () => toast.success('Request approved'),
                        onError: () => toast.error('Failed to approve request')
                      }
                    );
                  }}
                  disabled={updateRequest.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateRequest.mutate(
                      { requestId: request.id, status: 'REJECTED' },
                      {
                        onSuccess: () => toast.success('Request rejected'),
                        onError: () => toast.error('Failed to reject request')
                      }
                    );
                  }}
                  disabled={updateRequest.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 