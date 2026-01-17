
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Utensils,
  DollarSign,
  Receipt,
  Calculator,
  Wallet,
  CreditCard
} from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { GroupBalanceSummary } from '@/hooks/use-account-balance';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';

interface SummaryCardsProps {
  totalMeals: number;
  currentRate: number;
  myBalance: number;
  totalCost: number;
  activeRooms: number;
  totalMembers: number;
  totalAllMeals?: number;
  availableBalance?: number;
  groupBalance?: GroupBalanceSummary | null;
}

const PRIVILEGED_ROLES = ['ADMIN', 'MANAGER', 'MEAL_MANAGER', 'ACCOUNTANT'];

function isPrivileged(role?: string) {
  return !!role && PRIVILEGED_ROLES.includes(role);
}

export default function SummaryCards({
  totalMeals,
  currentRate,
  myBalance,
  totalCost,
  activeRooms,
  totalMembers,
  totalAllMeals = 0,
  availableBalance = 0,
  groupBalance,
}: SummaryCardsProps) {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  const member = activeGroup?.members?.find((m: any) => m.userId === session?.user?.id);
  const userRole = (activeGroup as any)?.userRole || member?.role;

  // Determine if we should show group stats
  // We use the passed groupBalance presence as the main indicator, 
  // but we can also double check role if needed.
  // The unified API only returns groupBalance if privileged, so presence check is enough.
  const showGroupStats = !!groupBalance;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Meals</CardTitle>
          <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">
            <NumberTicker value={totalMeals} className="text-lg sm:text-xl lg:text-2xl font-bold" /> / <NumberTicker value={totalAllMeals} className="text-lg sm:text-xl lg:text-2xl font-bold" />
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
            ৳<NumberTicker value={myBalance} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600" />
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
            <NumberTicker value={activeRooms} className="text-lg sm:text-xl lg:text-2xl font-bold" /> / <NumberTicker value={activeRooms} className="text-lg sm:text-xl lg:text-2xl font-bold" />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Active groups
          </p>
        </CardContent>
      </Card>

      {/* Only show group balance cards if groupBalance data is present */}
      {showGroupStats && groupBalance && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Group Total Balance</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupBalance.groupTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳<NumberTicker value={groupBalance.groupTotalBalance} decimalPlaces={2} className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupBalance.groupTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Group Balance
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
                ৳<NumberTicker value={groupBalance.totalExpenses} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Total group expenses
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
                ৳<NumberTicker value={groupBalance.mealRate} decimalPlaces={2} className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <NumberTicker value={groupBalance.totalMeals} className="text-[10px] sm:text-xs" /> total meals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Net Group Balance</CardTitle>
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupBalance.netGroupBalance === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                ৳<NumberTicker value={groupBalance.netGroupBalance} decimalPlaces={2} className={`text-lg sm:text-xl lg:text-2xl font-bold ${groupBalance.netGroupBalance === 0 ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {groupBalance.netGroupBalance === 0 ? 'Balanced' : 'Unbalanced'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}