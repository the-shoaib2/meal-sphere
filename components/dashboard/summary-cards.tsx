"use client";

import React from 'react';
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
import { useActiveGroup } from '@/contexts/group-context';

interface SummaryCardsProps {
  totalMeals: number;
  currentRate: number;
  myBalance: number;
  totalCost: number;
  activeRooms: number;
  totalMembers: number;
}

export default function SummaryCards({
  totalMeals,
  currentRate,
  myBalance,
  totalCost,
  activeRooms,
  totalMembers,
}: SummaryCardsProps) {
  const { activeGroup } = useActiveGroup();
  const { data: groupData } = useGroupBalances(activeGroup?.id!, true, true);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
          <Utensils className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMeals}</div>
          <p className="text-xs text-muted-foreground">
            Across all groups
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
          <CardTitle className="text-sm font-medium">My Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ৳{myBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across all groups
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeRooms}</div>
          <p className="text-xs text-muted-foreground">
            {totalMembers} total members
          </p>
        </CardContent>
      </Card>

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