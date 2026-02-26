"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  subtitle: string;
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
  hoverBgClass?: string;
  textColorClass?: string;
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

const SingleSummaryCard = ({
  title,
  subtitle,
  icon: Icon,
  iconColorClass,
  iconBgClass,
  hoverBgClass,
  textColorClass,
  children,
  className,
  isLoading,
}: SingleSummaryCardProps) => {
  return (
    <Card className={cn(
      "rounded-lg cursor-pointer transition-all",
      hoverBgClass || "hover:bg-accent/50",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-3">
        <CardTitle className="text-xs sm:text-lg font-semibold tracking-tight">{title}</CardTitle>
        <div className={cn("p-1.5 rounded-full", iconBgClass)}>
          <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconColorClass)} />
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-3 pb-1 pt-0">
        <div className={cn("text-lg sm:text-xl font-bold tracking-tight flex items-center gap-1 h-5 sm:h-6", textColorClass || "text-foreground")}>
          {isLoading ? (
            <Skeleton className="h-5 w-14" />
          ) : (
            children
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-1">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-[10px] sm:text-[12px] font-medium tracking-tight text-muted-foreground">{subtitle}</CardTitle>
        </div>
      </CardFooter>
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
        subtitle="Total Meals / All Meals"
        icon={Utensils}
        iconBgClass="bg-amber-500/10 dark:bg-amber-500/20"
        hoverBgClass="hover:bg-amber-500/5 dark:hover:bg-amber-500/10"
        iconColorClass="text-amber-600 dark:text-amber-500"
        textColorClass="text-amber-600 dark:text-amber-500"
        isLoading={isLoading}
      >
        <NumberTicker value={totalMeals} className="text-xl sm:text-2xl font-bold" />
        <span className="text-muted-foreground/30 font-medium">/</span>
        <NumberTicker value={totalAllMeals} className="text-xl sm:text-2xl font-bold text-muted-foreground/50" />
      </SingleSummaryCard>

      <SingleSummaryCard
        title="Meal Rate"
        subtitle="Current Meal Rate"
        icon={Calculator}
        iconBgClass="bg-blue-500/10 dark:bg-blue-500/20"
        hoverBgClass="hover:bg-blue-500/5 dark:hover:bg-blue-500/10"
        iconColorClass="text-blue-600 dark:text-blue-500"
        textColorClass="text-blue-600 dark:text-blue-500"
        isLoading={isLoading}
      >
        <span className="text-blue-600 dark:text-blue-500">৳</span>
        <NumberTicker value={currentRate} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
      </SingleSummaryCard>

      <SingleSummaryCard
        title="My Balance"
        subtitle="Available Balance"
        icon={Wallet}
        iconBgClass="bg-indigo-500/10 dark:bg-indigo-500/20"
        hoverBgClass="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10"
        iconColorClass="text-indigo-600 dark:text-indigo-500"
        textColorClass="text-indigo-600 dark:text-indigo-500"
        isLoading={isLoading}
      >
        <span className="text-indigo-600 dark:text-indigo-500">৳</span>
        <NumberTicker value={myBalance} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
      </SingleSummaryCard>

      <SingleSummaryCard
        title="Total Spent"
        subtitle="Total Spent on meals"
        icon={Receipt}
        iconBgClass="bg-rose-500/10 dark:bg-rose-500/20"
        hoverBgClass="hover:bg-rose-500/5 dark:hover:bg-rose-500/10"
        iconColorClass="text-rose-600 dark:text-rose-500"
        textColorClass="text-rose-600 dark:text-rose-500"
        isLoading={isLoading}
      >
        <span className="text-rose-600 dark:text-rose-500">৳</span>
        <NumberTicker value={totalCost} decimalPlaces={2} className="text-xl sm:text-2xl font-bold" />
      </SingleSummaryCard>

      {(groupBalance || isLoading) && (
        <>
          <SingleSummaryCard
            title="Group Balance"
            subtitle="Group Total Balance"
            icon={DollarSign}
            iconBgClass="bg-emerald-500/10 dark:bg-emerald-500/20"
            hoverBgClass={groupBalance && groupBalance.groupTotalBalance >= 0 ? 'hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10' : 'hover:bg-red-500/5 dark:hover:bg-red-500/10'}
            iconColorClass="text-emerald-600 dark:text-emerald-500"
            textColorClass={groupBalance && groupBalance.groupTotalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}
            className={groupBalance && groupBalance.groupTotalBalance < 0 ? 'text-red-600 dark:text-red-500' : ''}
            isLoading={isLoading}
          >
            <span>৳</span>
            <NumberTicker
              value={groupBalance?.groupTotalBalance ?? 0}
              decimalPlaces={2}
              className="text-xl sm:text-2xl font-bold"
            />
          </SingleSummaryCard>

          <SingleSummaryCard
            title="Group Exp."
            subtitle="Group Total Expenses"
            icon={Receipt}
            iconBgClass="bg-orange-500/10 dark:bg-orange-500/20"
            hoverBgClass="hover:bg-orange-500/5 dark:hover:bg-orange-500/10"
            iconColorClass="text-orange-600 dark:text-orange-500"
            textColorClass="text-orange-600 dark:text-orange-500"
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