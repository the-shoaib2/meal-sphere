'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Role } from '@prisma/client';
import { MoreVertical, UserPlus, Shield, Crown, UserCog, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useGroups } from '@/hooks/use-groups';
import { InviteCard } from '../invite-card';
import { Skeleton } from '@/components/ui/skeleton';

interface Member {
  id: string;
  role: Role;
  joinedAt: string;
  userId: string;
  roomId: string;
  isCurrent: boolean;
  isActive: boolean;
  lastActive: string;
  mutedUntil: string | null;
  permissions: any;
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
    createdAt: string;
  };
}

interface MembersTabProps {
  groupId: string;
  isAdmin: boolean;
  isCreator: boolean;
  currentUserId?: string;
  members: Member[];
  onMemberUpdate: () => void;
}

export function MembersTab({
  groupId,
  isAdmin,
  isCreator,
  currentUserId,
  members,
  onMemberUpdate,
}: MembersTabProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const { isLoading } = useGroups();
  const { toast } = useToast();

  const handleRoleChange = async (newRole: Role) => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${selectedMember.userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update member role');
      }

      toast({
        title: 'Success',
        description: `Member role updated to ${newRole}`,
      });
      onMemberUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    } finally {
      setShowRoleDialog(false);
      setSelectedMember(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${selectedMember.userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });
      onMemberUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setShowRemoveDialog(false);
      setSelectedMember(null);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.MANAGER:  
        return (
          <Badge variant="default" className="bg-purple-500">
            <Crown className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        );
      case Role.ADMIN:
        return (
          <Badge variant="default" className="bg-red-500">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case Role.MODERATOR:
        return (
          <Badge variant="default" className="bg-blue-500">
            <UserCog className="h-3 w-3 mr-1" />
            Moderator
          </Badge>
        );
      case Role.MEMBER:
        return (
          <Badge variant="default" className="bg-gray-500">
            Member
          </Badge>
        );
      case Role.MEAL_MANAGER:
        return (
          <Badge variant="default" className="bg-green-500">
            <UserCog className="h-3 w-3 mr-1" />
            Meal Manager
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Member
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
        <Card >
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>

              <div className="divide-y">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Members</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? 'member' : 'members'} in this group
              </p>
            </div>
            <InviteCard groupId={groupId} />
          </div>

          <div className="divide-y">
            {members.map((member, index) => (
              <div key={member.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.user.image} alt={member.user.name} />
                      <AvatarFallback>
                        {member.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.user.name}</span>
                        {getRoleBadge(member.role)}
                        {member.isCurrent && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {(isAdmin || isCreator) && !member.isCurrent && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {member.role !== Role.OWNER && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRoleDialog(true);
                              }}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRemoveDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 