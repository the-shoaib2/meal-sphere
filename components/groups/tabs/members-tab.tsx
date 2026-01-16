'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GroupRole } from '@prisma/client';
import { MoreVertical, UserPlus, Shield, Crown, UserCog, UserX, User } from 'lucide-react';
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
import { useGroups } from '@/hooks/use-groups';
import { InviteCard } from '../invite-card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfileDialog } from '../user-profile-dialog';
import { ChangeRoleDialog } from '../change-role-dialog';
import { RemoveMemberDialog } from '../remove-member-dialog';

interface Member {
  id: string;
  role: GroupRole;
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
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const { isLoading } = useGroups();
  const { toast } = useToast();

  const getRoleBadge = (role: GroupRole) => {
    switch (role) {
      case GroupRole.MANAGER:
        return (
          <Badge variant="default" className="bg-purple-500">
            <Crown className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        );
      case GroupRole.ADMIN:
        return (
          <Badge variant="default" className="bg-red-500">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case GroupRole.MODERATOR:
        return (
          <Badge variant="default" className="bg-blue-500">
            <UserCog className="h-3 w-3 mr-1" />
            Moderator
          </Badge>
        );
      case GroupRole.MEMBER:
        return (
          <Badge variant="default" className="bg-gray-500">
            Member
          </Badge>
        );
      case GroupRole.MEAL_MANAGER:
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
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member);
                            setShowProfileDialog(true);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        {member.role !== GroupRole.MANAGER && (
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
        onSuccess={onMemberUpdate}
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
        onSuccess={onMemberUpdate}
      />
    </Card>
  );
} 