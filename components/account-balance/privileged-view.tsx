"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { User, DollarSign, Users, TrendingUp, Calculator, Receipt, Utensils, ArrowRight } from 'lucide-react';
import type { GroupBalanceSummary } from '@/hooks/use-account-balance';
import { Button } from '@/components/ui/button';
import { BALANCE_PRIVILEGED_ROLES, hasBalancePrivilege } from '@/lib/auth/balance-permissions';

// Using centralized configuration
const PRIVILEGED_ROLES = BALANCE_PRIVILEGED_ROLES;

function isPrivileged(role?: string) {
  return hasBalancePrivilege(role);
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'default';
    case 'ACCOUNTANT': return 'default';
    case 'MANAGER':
    case 'MEAL_MANAGER':
    case 'MARKET_MANAGER':
      return 'secondary';
    default: return 'outline';
  }
};

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'bg-primary hover:bg-primary/90';
    case 'ACCOUNTANT': return 'bg-green-600 hover:bg-green-700';
    default: return '';
  }
};

interface PrivilegedViewProps {
  groupData: GroupBalanceSummary;
  userRole: string;
}

export function PrivilegedView({ groupData, userRole }: PrivilegedViewProps) {
  if (!groupData) return null;
  const { members, groupTotalBalance, totalExpenses, mealRate, totalMeals, netGroupBalance, currentPeriod } = groupData as any;
  const activeBalancesCount = members.filter((m: any) => m.balance !== 0).length;
  const router = useRouter();

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset visible count when members change (e.g. searching/filtering if implemented later)
  useEffect(() => {
    setVisibleCount(10);
  }, [members.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 10, members.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [members.length]);



  const sortedMembers = useMemo(() => {
    return [...members].sort((a: any, b: any) => {
      const dateA = new Date(a.joinedAt).getTime();
      const dateB = new Date(b.joinedAt).getTime();
      return dateA - dateB;
    });
  }, [members]);

  const visibleMembers = sortedMembers.slice(0, visibleCount);

  const handleViewDetails = (userId: string) => {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
    router.push(`/account-balance/${userId}`);
  };

  return (
    <div className="space-y-6">

      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

      <Card className="max-w-full">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full whitespace-nowrap rounded-md border">
            <div className="w-full">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Meals</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    {userRole === 'ADMIN' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.map((member: any) => (
                    <TableRow key={member.userId}>
                      <TableCell className="max-w-xs overflow-hidden">
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
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          className={getRoleBadgeStyle(member.role)}
                        >
                          {member.role?.replace('_', ' ')}
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
                      {userRole === 'ADMIN' && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"

                            className="text-primary flex items-center gap-1 group overflow-hidden transition-colors hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleViewDetails(member.userId)}
                          >
                            <span>Details</span>
                            <ArrowRight className="h-4 w-4 ml-1 transform transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1" />
                          </Button>
                        </TableCell>
                      )}

                    </TableRow>
                  ))}
                  {/* Sentinel element for infinite scroll */}
                  {visibleCount < members.length && (
                    <TableRow>
                      <TableCell colSpan={userRole === 'ADMIN' ? 7 : 6} className="p-0 border-0">
                        <div ref={observerTarget} className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div >
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
    <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
      <div className="p-1.5 sm:p-2 bg-muted rounded-md mb-1 sm:mb-0">
        <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] sm:text-sm text-muted-foreground font-medium leading-tight">{title}</p>
        <p className={`text-sm sm:text-xl font-bold truncate ${isCurrency ? (isPositive ? 'text-green-600' : 'text-red-600') : ''}`}>
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
); 