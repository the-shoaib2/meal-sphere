"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Utensils,
  DollarSign,
  Receipt,
  Calculator,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { GroupBalanceSummary } from '@/hooks/use-account-balance';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';
import { useDashboardLoading } from '@/components/dashboard/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  totalMeals?: number;
  currentRate?: number;
  myBalance?: number;
  totalCost?: number;
  activeRooms?: number;
  totalMembers?: number;
  totalAllMeals?: number;
  availableBalance?: number;
  groupBalance?: GroupBalanceSummary | null;
  isLoading?: boolean;
}

interface SingleSummaryCardProps {
  title: string;
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

const SingleSummaryCard = ({
  title,
  icon: Icon,
  iconColorClass,
  iconBgClass,
  children,
  className,
  isLoading,
}: SingleSummaryCardProps) => {
  return (
    <Card className={cn(
      "rounded-lg border backdrop-blur-sm transition-all hover:bg-accent/50",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 sm:p-3">
        <CardTitle className="text-xs sm:text-sm font-bold tracking-tight text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-1.5 rounded-full", iconBgClass)}>
          <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconColorClass)} />
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-4 pt-0">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-1 h-8">
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function SummaryCards({
  totalMeals = 0,
  currentRate = 0,
  myBalance = 0,
  totalCost = 0,
  activeRooms = 0,
  totalMembers = 0,
  totalAllMeals = 0,
  availableBalance = 0,
  groupBalance,
  isLoading: propIsLoading,
}: SummaryCardsProps) {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  const showGroupStats = !!groupBalance;
  const { isLoading: hookIsLoading } = useDashboardLoading();
  const isLoading = propIsLoading || hookIsLoading;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <SingleSummaryCard
        title="Total Meals"
        icon={Utensils}
        iconBgClass="bg-amber-500/10 dark:bg-amber-500/20"
        iconColorClass="text-amber-600 dark:text-amber-500"
        isLoading={isLoading}
      >
        <NumberTicker value={totalMeals} className="text-xl sm:text-2xl font-bold" />
        <span className="text-muted-foreground/30 font-medium">/</span>
        <NumberTicker value={totalAllMeals} className="text-xl sm:text-2xl font-bold text-muted-foreground/50" />
      </SingleSummaryCard>

      <SingleSummaryCard
        title="Meal Rate"
        icon={Calculator}
        iconBgClass="bg-blue-500/10 dark:bg-blue-500/20"
        iconColorClass="text-blue-600 dark:text-blue-500"
        isLoading={isLoading}
      >
        <span className="text-blue-600 dark:text-blue-500">৳</span>
        <NumberTicker value={currentRate} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
      </SingleSummaryCard>

      <SingleSummaryCard
        title="My Balance"
        icon={Wallet}
        iconBgClass="bg-indigo-500/10 dark:bg-indigo-500/20"
        iconColorClass="text-indigo-600 dark:text-indigo-500"
        isLoading={isLoading}
      >
        <span className="text-indigo-600 dark:text-indigo-500">৳</span>
        <NumberTicker value={myBalance} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
      </SingleSummaryCard>

      <SingleSummaryCard
        title="Total Spent"
        icon={Receipt}
        iconBgClass="bg-rose-500/10 dark:bg-rose-500/20"
        iconColorClass="text-rose-600 dark:text-rose-500"
        isLoading={isLoading}
      >
        <span className="text-rose-600 dark:text-rose-500">৳</span>
        <NumberTicker value={totalCost} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
      </SingleSummaryCard>

      {(groupBalance || isLoading) && (
        <>
          <SingleSummaryCard
            title="Group Balance"
            icon={DollarSign}
            iconBgClass="bg-emerald-500/10 dark:bg-emerald-500/20"
            iconColorClass="text-emerald-600 dark:text-emerald-500"
            className={groupBalance && groupBalance.groupTotalBalance < 0 ? 'text-red-600 dark:text-red-500' : ''}
            isLoading={isLoading}
          >
            <span className={groupBalance && groupBalance.groupTotalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}>৳</span>
            <NumberTicker
              value={groupBalance?.groupTotalBalance ?? 0}
              decimalPlaces={2}
              className={cn("text-xl sm:text-2xl font-bold", groupBalance && groupBalance.groupTotalBalance < 0 && "text-red-600 dark:text-red-500")}
            />
          </SingleSummaryCard>

          <SingleSummaryCard
            title="Group Exp."
            icon={Receipt}
            iconBgClass="bg-orange-500/10 dark:bg-orange-500/20"
            iconColorClass="text-orange-600 dark:text-orange-500"
            isLoading={isLoading}
          >
            <span className="text-orange-600 dark:text-orange-500">৳</span>
            <NumberTicker value={groupBalance?.totalExpenses ?? 0} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
          </SingleSummaryCard>
        </>
      )}
    </div>
  );
}