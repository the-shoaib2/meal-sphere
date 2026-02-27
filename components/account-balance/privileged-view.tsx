"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
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
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { hasBalancePrivilege } from '@/lib/auth/balance-permissions';
import { Role } from '@prisma/client';

function isPrivileged(role?: Role | null) {
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
  userRole: Role;
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

      <Card className="max-w-full shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold">All Members</CardTitle>
          <Badge variant="secondary" className="font-bold">
            {members.length} Users
          </Badge>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop View - Table */}
          <div className="hidden md:block">
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">User</TableHead>
                    <TableHead className="font-bold text-center">Role</TableHead>
                    <TableHead className="text-right font-bold">Balance</TableHead>
                    <TableHead className="text-right font-bold">Meals</TableHead>
                    <TableHead className="text-right font-bold">Spent</TableHead>
                    <TableHead className="text-right font-bold">Available</TableHead>
                    {userRole === 'ADMIN' && <TableHead className="text-right font-bold">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.map((member: any) => (
                    <TableRow key={member.userId} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-1 ring-border">
                            <AvatarImage src={member.user.image || ''} />
                            <AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{member.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          className={cn("text-[10px] uppercase font-bold tracking-wider", getRoleBadgeStyle(member.role))}
                        >
                          {member.role?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={member.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ৳{member.balance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {member.mealCount || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium text-muted-foreground text-xs">
                        ৳{(member.totalSpent || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={(member.availableBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ৳{(member.availableBalance || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      {userRole === 'ADMIN' && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary hover:bg-primary hover:text-primary-foreground font-bold h-8"
                            onClick={() => handleViewDetails(member.userId)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Infinite scrolling sentinel for desktop */}
            {visibleCount < members.length && (
              <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Mobile View - Polished Card List */}
          <div className="md:hidden divide-y divide-border/50">
            {visibleMembers.map((member: any) => (
              <div key={member.userId} className="p-4 bg-card hover:bg-muted/10 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-1 ring-border shadow-sm">
                      <AvatarImage src={member.user.image || ''} />
                      <AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-sm tracking-tight">{member.user.name}</p>
                      <Badge
                        variant={getRoleBadgeVariant(member.role)}
                        className={cn("text-[9px] h-4 uppercase font-bold tracking-tighter", getRoleBadgeStyle(member.role))}
                      >
                        {member.role?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  {userRole === 'ADMIN' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary font-bold h-8 px-2"
                      onClick={() => handleViewDetails(member.userId)}
                    >
                      View Detail <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Balance</p>
                    <p className={cn("text-xs font-bold", member.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                      ৳{member.balance.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5 text-right">Available</p>
                    <p className={cn("text-xs font-bold text-right", (member.availableBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                      ৳{(member.availableBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50 col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Meals</p>
                      <p className="text-xs font-bold">{member.mealCount || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Total Spent</p>
                      <p className="text-xs font-bold text-red-600/80">৳{(member.totalSpent || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Infinite scroll sentinel for mobile */}
            {visibleCount < members.length && (
              <div ref={observerTarget} className="h-16 flex items-center justify-center p-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  );
}