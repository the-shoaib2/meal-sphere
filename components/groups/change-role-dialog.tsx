import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Role } from '@prisma/client';
import { Shield, UserCog } from 'lucide-react';
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
    role: Role;
  } | null;
  groupId: string;
  onSuccess: () => void;
}

export function ChangeRoleDialog({
  isOpen,
  onClose,
  member,
  groupId,
  onSuccess,
}: ChangeRoleDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: Role) => {
    if (!member) return;

    setIsLoading(true);
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
        title: 'Success',
        description: `Member role updated to ${newRole}`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Member Role</AlertDialogTitle>
          <AlertDialogDescription>
            Select a new role for {member?.user.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2 py-4">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleRoleChange(Role.ADMIN)}
            disabled={isLoading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleRoleChange(Role.MODERATOR)}
            disabled={isLoading}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Moderator
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleRoleChange(Role.MEMBER)}
            disabled={isLoading}
          >
            Member
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleRoleChange(Role.MEAL_MANAGER)}
            disabled={isLoading}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Meal Manager
          </Button>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 