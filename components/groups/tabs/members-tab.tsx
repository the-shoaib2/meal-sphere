'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Permission } from '@/lib/auth/permissions';
import { removeMemberAction, updateMemberRoleAction } from '@/lib/actions/group.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Role } from '@prisma/client';
import { MoreVertical, UserPlus, Shield, Crown, UserCog, UserX, User, ChefHat, BadgeDollarSign, ShoppingCart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { InviteCard } from '@/components/groups/invite-card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfileDialog } from '@/components/groups/user-profile-dialog';
import { ChangeRoleDialog } from '@/components/groups/change-role-dialog';
import { RemoveMemberDialog } from '@/components/groups/remove-member-dialog';

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
  group: any;
  isAdmin: boolean;
  isCreator: boolean;
  currentUserId?: string;
  members: Member[];
  onMemberUpdate: () => void;
  initialInviteTokens?: any[];
  canInvite?: boolean;
  isMember?: boolean;
  permissions?: Permission[];
}

export function MembersTab({
  groupId,
  group,
  isAdmin,
  isCreator,
  currentUserId,
  members,
  onMemberUpdate,
  initialInviteTokens = [],
  canInvite = true,
  isMember = true,
  permissions = [],
}: MembersTabProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isLoading = false; // Set to true if actually fetching

  const [optimisticMembers, addOptimisticMember] = useOptimistic(
    members,
    (state, { type, payload }: { type: 'remove' | 'updateRole', payload: any }) => {
      if (type === 'remove') {
        return state.filter(m => m.userId !== payload);
      }
      if (type === 'updateRole') {
        return state.map(m => m.userId === payload.userId ? { ...m, role: payload.role } : m);
      }
      return state;
    }
  );

  const canManageMember = (member: Member) => {
    if (member.isCurrent) return false;
    if (isCreator) return true;

    // Check if user has MANAGE_MEMBERS permission
    const hasManagePermission = permissions.includes(Permission.MANAGE_MEMBERS);
    if (!hasManagePermission) return false;

    // Only creator can manage Admins
    if (member.role === Role.ADMIN) return false;

    return true;
  };

  const handleRemoveMember = async (userId: string) => {
    startTransition(async () => {
      addOptimisticMember({ type: 'remove', payload: userId });
      try {
        const result = await removeMemberAction(groupId, userId);
        if (!result.success) {
          toast({ title: 'Error', description: result.message || 'Failed to remove member', variant: 'destructive' });
          onMemberUpdate(); // Revert on error
        } else {
          toast({ title: 'Success', description: 'Member removed successfully' });
          onMemberUpdate();
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
        onMemberUpdate();
      }
    });
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    startTransition(async () => {
      addOptimisticMember({ type: 'updateRole', payload: { userId, role: newRole } });
      try {
        const result = await updateMemberRoleAction(groupId, userId, newRole);
        if (!result.success) {
          toast({ title: 'Error', description: result.message || 'Failed to update role', variant: 'destructive' });
          onMemberUpdate();
        } else {
          toast({ title: 'Success', description: 'Role updated successfully' });
          onMemberUpdate();
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
        onMemberUpdate();
      }
    });
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.MANAGER:
        return (
          <Badge variant="default" className="bg-purple-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        );
      case Role.ADMIN:
        return (
          <Badge variant="default" className="bg-red-500 text-white">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case Role.MODERATOR:
        return (
          <Badge variant="default" className="bg-blue-500 text-white">
            <UserCog className="h-3 w-3 mr-1" />
            Moderator
          </Badge>
        );
      case Role.MEMBER:
        return (
          <Badge variant="default" className="bg-gray-500 text-white">
            Member
          </Badge>
        );
      case Role.MEAL_MANAGER:
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            <ChefHat className="h-3 w-3 mr-1" />
            Meal Manager
          </Badge>
        );
      case Role.ACCOUNTANT:
        return (
          <Badge variant="default" className="bg-emerald-500 text-white">
            <BadgeDollarSign className="h-3 w-3 mr-1" />
            Accountant
          </Badge>
        );
      case Role.MARKET_MANAGER:
        return (
          <Badge variant="default" className="bg-purple-500 text-white">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Market Manager
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {role}
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
                {optimisticMembers.length} {optimisticMembers.length === 1 ? 'member' : 'members'} in this group
              </p>
            </div>
            {isMember && (
              <InviteCard
                groupId={groupId}
                group={group}
                initialTokens={initialInviteTokens}
                canInvite={canInvite}
              />
            )}
          </div>

          <div className="divide-y">
            {optimisticMembers.map((member) => (
              <div key={member.id} className={cn("p-3 transition-opacity", isPending && "opacity-70")}>
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

                  {canManageMember(member) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member);
                            setShowProfileDialog(true);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        {member.role !== Role.MANAGER && (
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

      {/* User Profile Dialog */}
      {selectedMember && (
        <UserProfileDialog
          user={{
            id: selectedMember.user.id,
            name: selectedMember.user.name,
            email: selectedMember.user.email,
            image: selectedMember.user.image,
            role: selectedMember.role,
            createdAt: selectedMember.user.createdAt,
            joinedAt: selectedMember.joinedAt,
            isActive: selectedMember.isActive,
            lastActive: selectedMember.lastActive,
          }}
          isOpen={showProfileDialog}
          onClose={() => {
            setShowProfileDialog(false);
            setSelectedMember(null);
          }}
        />
      )}

      {/* Change Role Dialog */}
      <ChangeRoleDialog
        isOpen={showRoleDialog}
        onClose={() => {
          setShowRoleDialog(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        groupId={groupId}
        onSuccess={(newRole: Role) => { handleUpdateRole(selectedMember?.userId!, newRole); }}
      />

      {/* Remove Member Dialog */}
      <RemoveMemberDialog
        isOpen={showRemoveDialog}
        onClose={() => {
          setShowRemoveDialog(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        groupId={groupId}
        onSuccess={() => handleRemoveMember(selectedMember?.userId!)}
      />
    </Card>
  );
}
