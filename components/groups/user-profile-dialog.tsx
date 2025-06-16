import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Users, 
  Clock, 
  Activity,
  ShoppingBag,
  Receipt,
  Utensils,
  Wallet
} from 'lucide-react';

interface UserProfileDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: Role;
    createdAt: string;
    joinedAt: string;
    isActive: boolean;
    lastActive?: string;
    // Additional stats
    totalMeals?: number;
    totalPayments?: number;
    totalShopping?: number;
    totalExpenses?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileDialog({ user, isOpen, onClose }: UserProfileDialogProps) {
  const getRoleBadge = (role: Role) => {
    const roleMap: Partial<Record<Role, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>> = {
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
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>User Profile - {user.name || 'Unknown User'}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-lg" />
          
          {/* Profile Section */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 space-y-4 sm:space-y-0 sm:space-x-4">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={user.image || ''} />
                <AvatarFallback className="text-3xl">
                  {user.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold">{user.name || 'Unknown User'}</h3>
                <div className="flex items-center justify-center sm:justify-start space-x-2 mt-1">
                  {getRoleBadge(user.role)}
                  <Badge variant={user.isActive ? "default" : "destructive"}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Joined {format(new Date(user.joinedAt), 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Role: {getRoleBadge(user.role)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Last active: {user.lastActive ? format(new Date(user.lastActive), 'MMM d, yyyy') : 'Never'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Activity items would go here */}
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="h-[120px]">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-1">
                        <Utensils className="h-6 w-6 text-blue-500" />
                        <div className="text-xl font-bold">{user.totalMeals || 0}</div>
                        <p className="text-xs text-muted-foreground">Total Meals</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="h-[120px]">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-1">
                        <Wallet className="h-6 w-6 text-green-500" />
                        <div className="text-xl font-bold">{user.totalPayments || 0}</div>
                        <p className="text-xs text-muted-foreground">Payments</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="h-[120px]">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-1">
                        <ShoppingBag className="h-6 w-6 text-purple-500" />
                        <div className="text-xl font-bold">{user.totalShopping || 0}</div>
                        <p className="text-xs text-muted-foreground">Shopping</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="h-[120px]">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-1">
                        <Receipt className="h-6 w-6 text-orange-500" />
                        <div className="text-xl font-bold">{user.totalExpenses || 0}</div>
                        <p className="text-xs text-muted-foreground">Expenses</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 