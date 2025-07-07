"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { User, DollarSign, Users, TrendingUp, Calculator, Receipt, Utensils, ArrowRight } from 'lucide-react';
import type { GroupBalanceSummary } from '@/hooks/use-account-balance';
import { Button } from '@/components/ui/button';

// Using the same PRIVILEGED_ROLES from the main panel
const PRIVILEGED_ROLES = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

interface PrivilegedViewProps {
  groupData: GroupBalanceSummary;
  userRole: string;
}

export default function PrivilegedView({ groupData, userRole }: PrivilegedViewProps) {
  const { members, groupTotalBalance, totalExpenses, mealRate, totalMeals, netGroupBalance, currentPeriod } = groupData as any;
  const activeBalancesCount = members.filter((m: any) => m.balance !== 0).length;
  const router = useRouter();

  const handleViewDetails = (userId: string) => {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
    router.push(`/account-balance/${userId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-bold">Account Balances</h1>
            {currentPeriod && (
              <Badge variant={currentPeriod.isLocked ? "destructive" : "default"} className="text-xs w-fit">
                {currentPeriod.name} {currentPeriod.isLocked ? "(Locked)" : ""}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">Manage all user balances and transactions.</p>
        </div>
        <Badge variant="outline">{userRole}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Members" value={members.length} />
        <StatCard icon={TrendingUp} title="Active Balances" value={activeBalancesCount} />
        <StatCard
          icon={DollarSign}
          title="Group Total"
          value={`৳${groupTotalBalance.toFixed(2)}`}
          isCurrency
          isPositive={groupTotalBalance >= 0}
        />
        <StatCard
          icon={Calculator}
          title="Balance Status"
          value={netGroupBalance === 0 ? 'Balanced' : 'Unbalanced'}
          isPositive={netGroupBalance === 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Receipt}
          title="Total Expenses"
          value={`৳${totalExpenses.toFixed(2)}`}
          isCurrency
          isPositive={false}
        />
        <StatCard
          icon={Utensils}
          title="Total Meals"
          value={totalMeals}
        />
        <StatCard
          icon={Calculator}
          title="Meal Rate"
          value={`৳${mealRate.toFixed(2)}`}
          isCurrency
          isPositive={true}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Meals</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user.image || ''} />
                          <AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPrivileged(member.role) ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={member.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ৳{member.balance.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.mealCount || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{(member.totalSpent || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={(member.availableBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ৳{(member.availableBalance || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary flex items-center gap-1 group overflow-hidden"
                        onClick={() => handleViewDetails(member.userId)}
                      >
                        <span>Details</span>
                        <ArrowRight className="h-4 w-4 ml-1 transform transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const StatCard = ({ icon: Icon, title, value, isCurrency = false, isPositive }: {
  icon: React.ElementType,
  title: string,
  value: string | number,
  isCurrency?: boolean,
  isPositive?: boolean,
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-2 bg-muted rounded-md">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold ${isCurrency ? (isPositive ? 'text-green-600' : 'text-red-600') : ''}`}>
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
); 