"use client";

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Utensils,
  DollarSign,
  TrendingUp,
  Receipt,
  Calculator,
  Wallet,
  CreditCard
} from 'lucide-react';
import { useGroupBalances } from '@/hooks/use-account-balance';
import { useDashboardSummary } from '@/hooks/use-dashboard';
import { useActiveGroup } from '@/contexts/group-context';
import { useSession } from 'next-auth/react';
import { useGroups } from '@/hooks/use-groups';
import { Skeleton } from '@/components/ui/skeleton';
import { NumberTicker } from '@/components/ui/number-ticker';

interface SummaryCardsProps {
  totalMeals: number;
  currentRate: number;
  myBalance: number;
  totalCost: number;
  activeRooms: number;
  totalMembers: number;
}

const PRIVILEGED_ROLES = ['ADMIN', 'MANNAGER', 'MEAL_MANNAGER'];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

export default function SummaryCards({
  totalMeals: initialTotalMeals,
  currentRate: initialCurrentRate,
  myBalance: initialMyBalance,
  totalCost: initialTotalCost,
  activeRooms: initialActiveRooms,
  totalMembers: initialTotalMembers,
}: SummaryCardsProps) {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  const { data: userGroups = [] } = useGroups();

  // Fetch dashboard summary data using the custom hook
  const { data: summaryData, isLoading: isLoadingSummary, error: summaryError } = useDashboardSummary();

  // Use fetched data or fall back to props
  const totalUserMeals = summaryData?.totalUserMeals ?? initialTotalMeals;
  const totalAllMeals = summaryData?.totalAllMeals ?? initialTotalMeals;
  const currentRate = summaryData?.currentRate ?? initialCurrentRate;
  const currentBalance = summaryData?.currentBalance ?? initialMyBalance;
  const availableBalance = summaryData?.availableBalance ?? initialMyBalance;
  const totalCost = summaryData?.totalCost ?? initialTotalCost;
  const userActiveRooms = summaryData?.activeRooms ?? initialActiveRooms;
  const totalActiveGroups = summaryData?.totalActiveGroups ?? initialActiveRooms;
  const totalMembers = summaryData?.totalMembers ?? initialTotalMembers;

  // Check if user has privileged access to the active group
  const member = activeGroup?.members?.find(m => m.userId === session?.user?.id);
  const userRole = member?.role;
  const hasPrivilege = isPrivileged(userRole);

  const { data: groupData, error: groupError } = useGroupBalances(activeGroup?.id!, hasPrivilege, true);

  // Show skeleton loading while data is being fetched
  if (isLoadingSummary) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={`skeleton-${i}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
              <Skeleton className="h-4 w-4 sm:h-6 sm:w-6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24 mb-1 sm:mb-2" />
              <Skeleton className="h-3 sm:h-4 w-28 sm:w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }


  // Show error message if there's an error
  if (summaryError) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-center text-red-600 text-sm sm:text-base">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground text-xs sm:text-sm">
              {summaryError.message === 'You are not a member of this group'
                ? 'You are not a member of the selected group. Please select a different group.'
                : 'Failed to load dashboard data. Please try again.'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Meals</CardTitle>
          <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">
            <NumberTicker value={totalUserMeals} className="text-lg sm:text-xl lg:text-2xl font-bold" /> / <NumberTicker value={totalAllMeals} className="text-lg sm:text-xl lg:text-2xl font-bold" />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            My meals / Total meals
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Current Meal Rate</CardTitle>
          <Calculator className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">
            ৳<NumberTicker value={currentRate} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold" />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Average per meal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Current Balance</CardTitle>
          <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
            ৳<NumberTicker value={currentBalance} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600" />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Total money in account
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Available Balance</CardTitle>
          <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ৳<NumberTicker value={availableBalance} decimalPlaces={2} className={`text-lg sm:text-xl lg:text-2xl font-bold ${availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            After meal expenses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Spent on Meals</CardTitle>
          <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
            ৳<NumberTicker value={totalCost} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600" />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Total meal expenses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Active Groups</CardTitle>
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">
            <NumberTicker value={userActiveRooms} className="text-lg sm:text-xl lg:text-2xl font-bold" /> / <NumberTicker value={totalActiveGroups} className="text-lg sm:text-xl lg:text-2xl font-bold" />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            My groups / Total active groups
          </p>
        </CardContent>
      </Card>

      {/* Only show group balance cards if user has privileged access */}
      {activeGroup && groupData && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Group Total Balance</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupData.groupTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳<NumberTicker value={groupData.groupTotalBalance} decimalPlaces={2} className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupData.groupTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {activeGroup.name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Group Expenses</CardTitle>
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                ৳<NumberTicker value={groupData.totalExpenses} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Total expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Group Meal Rate</CardTitle>
              <Calculator className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                ৳<NumberTicker value={groupData.mealRate} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <NumberTicker value={groupData.totalMeals} className="text-[10px] sm:text-xs" /> total meals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Net Group Balance</CardTitle>
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupData.netGroupBalance === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                ৳<NumberTicker value={groupData.netGroupBalance} decimalPlaces={2} className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupData.netGroupBalance === 0 ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {groupData.netGroupBalance === 0 ? 'Balanced' : 'Unbalanced'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 