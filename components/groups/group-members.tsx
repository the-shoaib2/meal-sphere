'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { InviteCard } from './invite-card';

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  userId: string;
  roomId: string;
  isCurrent: boolean;
  isActive: boolean;
  lastActive: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type GroupMembersProps = {
  groupId: string;
  isAdmin: boolean;
  currentUserId?: string;
  members: Member[];
  onMemberUpdate?: (updatedMembers: Member[]) => void;
};

export function GroupMembers({ 
  groupId, 
  isAdmin, 
  currentUserId, 
  members = [],
  onMemberUpdate 
}: GroupMembersProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [memberToUpdateRole, setMemberToUpdateRole] = useState<{id: string, role: string} | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const filteredMembers = members.filter(
    (member) =>
      member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateMember = (memberId: string, updates: Partial<Member>) => {
    const updatedMembers = members.map(member => 
      member.id === memberId ? { ...member, ...updates } : member
    );
    onMemberUpdate?.(updatedMembers);
  };

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      setMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string, role: string }) => {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update member role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Member role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      setMemberToUpdateRole(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update member role');
    },
  });

  const handleRemoveClick = (member: Member) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  const handleRoleChangeClick = (memberId: string, currentRole: string) => {
    setMemberToUpdateRole({
      id: memberId,
      role: currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    });
  };

  const confirmRoleChange = () => {
    if (memberToUpdateRole) {
      updateMemberRoleMutation.mutate({
        memberId: memberToUpdateRole.id,
        role: memberToUpdateRole.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
      });
    }
  }; 

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ADMIN: { label: 'Admin', variant: 'default' },
      MODERATOR: { label: 'Moderator', variant: 'secondary' },
      MEMBER: { label: 'Member', variant: 'outline' },
    };

    const roleInfo = roleMap[role] || { label: role, variant: 'outline' as const };
    
    return (
      <Badge variant={roleInfo.variant} className="text-xs">
        {roleInfo.label}
      </Badge>
    );
  };

  const canManageMember = (member: Member) => {
    if (!isAdmin) return false;
    if (member.role === 'ADMIN' && member.user.id !== currentUserId) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.user.name || 'this member'} from the group? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveMember}
              disabled={removeMemberMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Role Confirmation Dialog */}
      <AlertDialog
        open={!!memberToUpdateRole}
        onOpenChange={(open) => !open && setMemberToUpdateRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToUpdateRole?.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToUpdateRole?.role === 'ADMIN'
                ? 'Are you sure you want to remove admin privileges? This member will no longer have admin access.'
                : 'Are you sure you want to make this member an admin? They will have full access to manage the group.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMemberRoleMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRoleChange}
              disabled={updateMemberRoleMutation.isPending}
            >
              {updateMemberRoleMutation.isPending 
                ? 'Updating...' 
                : memberToUpdateRole?.role === 'ADMIN' 
                  ? 'Remove Admin' 
                  : 'Make Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Members</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members..."
                className="pl-8 w-[200px] lg:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <InviteCard groupId={groupId} className="ml-2" />
          </div>
        </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3 px-1 hover:bg-muted/50 rounded"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.user.image || ''} />
                      <AvatarFallback>
                        {member.user.name
                          ?.split(' ')
                          .map((n) => n?.[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{member.user.name || 'Unknown User'}</span>
                        {member.user.id === currentUserId && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(member.role)}
                    {canManageMember(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === 'MEMBER' && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChangeClick(member.id, member.role)}
                            >
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {member.role === 'ADMIN' && member.user.id !== currentUserId && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChangeClick(member.id, member.role)}
                            >
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveClick(member)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
