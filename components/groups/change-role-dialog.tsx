import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GroupRole } from '@prisma/client';
import { Shield, UserCog, Users, ChefHat, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

interface ChangeRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    userId: string;
    user: {
      name: string;
    };
    role: GroupRole;
  } | null;
  groupId: string;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { role: GroupRole.ADMIN, label: 'Admin', icon: Shield },
  { role: GroupRole.MODERATOR, label: 'Moderator', icon: UserCog },
  { role: GroupRole.MEMBER, label: 'Member', icon: Users },
  { role: GroupRole.MEAL_MANAGER, label: 'Meal Manager', icon: ChefHat },
];

export function ChangeRoleDialog({
  isOpen,
  onClose,
  member,
  groupId,
  onSuccess,
}: ChangeRoleDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<GroupRole | null>(null);

  const handleRoleChange = async (newRole: GroupRole) => {
    if (!member) return;
    setIsLoading(true);
    setLoadingRole(newRole);
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${member.userId}/role`, {
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
        title: 'Role Updated',
        description: `${member.user.name} is now ${newRole.replace('_', ' ').toLowerCase()}.`,
      });
      onSuccess();
      setTimeout(onClose, 500); // Auto-close after toast
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingRole(null);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-xs p-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Change Role</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            Select a new role for <span className="font-semibold">{member?.user.name}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Centered loader */}
        {isLoading && (
          <div className="flex justify-center my-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {/* Vertical role buttons */}
        <div className="flex flex-col gap-2 py-2">
          {ROLE_OPTIONS.map(({ role, label, icon: Icon }) => (
            <Button
              key={role}
              variant={member?.role === role ? 'default' : 'outline'}
              className="flex items-center gap-2 justify-center text-xs py-2 transition-all duration-150 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => handleRoleChange(role)}
              disabled={isLoading || member?.role === role}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full text-xs font-semibold border-2 border-muted-foreground/20 hover:bg-muted/60 transition-colors duration-150"
          >
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 