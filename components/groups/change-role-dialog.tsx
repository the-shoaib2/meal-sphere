import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Role } from '@prisma/client';
import { Shield, UserCog, Users, ChefHat, Loader2, Check, Scale, BadgeDollarSign, ShoppingCart, Ban } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateMemberRoleAction } from '@/lib/actions/group.actions';

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
  onSuccess: (role: Role) => void;
}

const ROLE_OPTIONS = [
  {
    role: Role.ADMIN,
    label: 'Admin',
    description: 'Full control over group settings and members.',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  {
    role: Role.MODERATOR,
    label: 'Moderator',
    description: 'Can manage members and join requests.',
    icon: UserCog,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    role: Role.MEAL_MANAGER,
    label: 'Meal Manager',
    description: 'Manages meal schedules and guest meals.',
    icon: ChefHat,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    role: Role.ACCOUNTANT,
    label: 'Accountant',
    description: 'Manages payments and group balances.',
    icon: BadgeDollarSign,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  },
  {
    role: Role.MARKET_MANAGER,
    label: 'Market Manager',
    description: 'Manages shopping items and market dates.',
    icon: ShoppingCart,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  {
    role: Role.MEMBER,
    label: 'Member',
    description: 'Regular member with standard access.',
    icon: Users,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10'
  },
  {
    role: Role.BANNED,
    label: 'Banned',
    description: 'Restricted from group activities.',
    icon: Ban,
    color: 'text-rose-600',
    bgColor: 'bg-rose-600/10'
  },
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
  const [selectedRole, setSelectedRole] = useState<Role | null>(member?.role || null);

  const handleRoleChange = async () => {
    if (!member || !selectedRole || selectedRole === member.role) return;

    setIsLoading(true);
    try {
      const result = await updateMemberRoleAction(groupId, member.userId, selectedRole);

      if (!result.success) {
        throw new Error(result.message || 'Failed to update member role');
      }

      toast({
        title: 'Role Updated',
        description: `${member.user.name} is now ${selectedRole.replace('_', ' ').toLowerCase()}.`,
      });

      // Call onSuccess immediately for optimistic feel
      onSuccess(selectedRole);
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
    <AlertDialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <AlertDialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden border-none shadow-2xl">
        <AlertDialogHeader className="p-6 pb-2 border-b bg-muted/30">
          <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Change Member Role
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Choose a new role for <span className="font-semibold text-foreground">{member?.user.name}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[60vh] p-6">
          <div className="grid gap-3">
            {ROLE_OPTIONS.map(({ role, label, description, icon: Icon, color, bgColor }) => {
              const isSelected = selectedRole === role;
              const isCurrent = member?.role === role;

              return (
                <button
                  key={role}
                  disabled={isLoading || isCurrent}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "relative flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200",
                    "border-2 hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent",
                    isCurrent && "opacity-50 cursor-not-allowed bg-muted/30 border-dashed border-muted-foreground/30",
                    isLoading && "opacity-80 pointer-events-none"
                  )}
                >
                  <div className={cn("p-2 rounded-lg shrink-0", bgColor, color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="font-semibold text-sm leading-none flex items-center gap-2">
                      {label}
                      {isCurrent && <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground uppercase tracking-wider">Current</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {description}
                    </p>
                  </div>
                  {isSelected && !isCurrent && (
                    <div className="absolute top-4 right-4 text-primary animate-in zoom-in duration-300">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="p-6 pt-2 border-t bg-muted/30 flex sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRoleChange}
            disabled={isLoading || !selectedRole || selectedRole === member?.role}
            className="flex-1 sm:min-w-[120px] shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
