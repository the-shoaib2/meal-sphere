import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Role } from "@prisma/client";
import { format } from "date-fns";

interface UserProfileDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: Role;
    createdAt: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileDialog({ user, isOpen, onClose }: UserProfileDialogProps) {
  const getRoleBadge = (role: Role) => {
    const roleMap: Record<Role, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ADMIN: { label: 'Admin', variant: 'default' },
      MODERATOR: { label: 'Moderator', variant: 'secondary' },
      MANAGER: { label: 'Manager', variant: 'secondary' },
      LEADER: { label: 'Leader', variant: 'secondary' },
      MEAL_MANAGER: { label: 'Meal Manager', variant: 'secondary' },
      ACCOUNTANT: { label: 'Accountant', variant: 'secondary' },
      MARKET_MANAGER: { label: 'Market Manager', variant: 'secondary' },
      MEMBER: { label: 'Member', variant: 'outline' },
    };

    const roleInfo = roleMap[role] || { label: role, variant: 'outline' as const };
    
    return (
      <Badge variant={roleInfo.variant} className="text-xs">
        {roleInfo.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.image || ''} />
              <AvatarFallback className="text-2xl">
                {user.name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{user.name || 'Unknown User'}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {getRoleBadge(user.role)}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Member Since</dt>
                  <dd className="text-sm">
                    {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                  <dd className="text-sm">
                    {getRoleBadge(user.role)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 