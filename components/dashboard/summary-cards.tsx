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

interface SummaryCardsProps {
  totalMeals: number;
  currentRate: number;
  myBalance: number;
  totalCost: number;
  activeRooms: number;
  totalMembers: number;
}

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN', 'ACCOUNTANT'];

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

  // Show message when no group is selected
  if (!activeGroup) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-center">No Group Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Please select a group from the group switcher to view your dashboard summary.
            </p>
            {userGroups.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                You have {userGroups.length} group(s) available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error message if there's an error
  if (summaryError) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
          <Utensils className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUserMeals} / {totalAllMeals}</div>
          <p className="text-xs text-muted-foreground">
            My meals / Total meals
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Meal Rate</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">৳{currentRate.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Average per meal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            ৳{currentBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total money in account
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ৳{availableBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            After meal expenses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent on Meals</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ৳{totalCost.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total meal expenses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userActiveRooms} / {totalActiveGroups}</div>
          <p className="text-xs text-muted-foreground">
            My groups / Total active groups
          </p>
        </CardContent>
      </Card>

      {/* Only show group balance cards if user has privileged access */}
      {activeGroup && groupData && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Group Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${groupData.groupTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳{groupData.groupTotalBalance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeGroup.name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Group Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ৳{groupData.totalExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Group Meal Rate</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ৳{groupData.mealRate.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {groupData.totalMeals} total meals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Group Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${groupData.netGroupBalance === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                ৳{groupData.netGroupBalance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {groupData.netGroupBalance === 0 ? 'Balanced' : 'Unbalanced'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 