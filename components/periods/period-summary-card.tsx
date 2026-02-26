'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar, Users, DollarSign, Utensils, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeriodSummary } from '@/hooks/use-periods';
import { PeriodStatus } from '@prisma/client';
import { NumberTicker } from '@/components/ui/number-ticker';


interface PeriodSummaryCardProps {
  period: any;
  summary?: PeriodSummary;
}

export function PeriodSummaryCard({ period, summary }: PeriodSummaryCardProps) {
  if (!period) return null;

  const getStatusBadge = () => {
    if (period.isLocked) {
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
          Locked
        </Badge>
      );
    }

    const status = period.status as PeriodStatus;
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500/10 text-green-600 border-none">Active</Badge>;
      case 'ENDED':
        return <Badge className="bg-amber-500/10 text-amber-600 border-none">Ended</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-slate-500/10 text-slate-500 border-none">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalExpenses = (summary?.totalShoppingAmount || 0) + (summary?.totalExtraExpenses || 0);
  const netBalance = (summary?.totalPayments || 0) - totalExpenses + (summary?.openingBalance || 0);
  const isPositive = netBalance >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{period.name}</span>
            </CardTitle>
            <CardDescription>
              {format(new Date(period.startDate), 'MMM dd, yyyy')} - {period.endDate ? format(new Date(period.endDate), 'MMM dd, yyyy') : 'Ongoing'}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Meals</span>
            </div>
            <div className="text-2xl font-bold"><NumberTicker value={summary?.totalMeals || 0} /></div>
            <p className="text-xs text-muted-foreground">
              <NumberTicker value={summary?.totalGuestMeals || 0} /> guest meals
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Members</span>
            </div>
            <div className="text-2xl font-bold"><NumberTicker value={summary?.memberCount || 0} /></div>
            <p className="text-xs text-muted-foreground">
              <NumberTicker value={summary?.activeMemberCount || 0} /> active
            </p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Financial Summary</h4>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Opening Balance:</span>
              <span className="font-medium">$<NumberTicker value={summary?.openingBalance || 0} decimalPlaces={2} /></span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Total Payments:</span>
              <span className="font-medium text-green-600">+$<NumberTicker value={summary?.totalPayments || 0} decimalPlaces={2} /></span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Shopping Expenses:</span>
              <span className="font-medium text-red-600">-$<NumberTicker value={summary?.totalShoppingAmount || 0} decimalPlaces={2} /></span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Extra Expenses:</span>
              <span className="font-medium text-red-600">-$<NumberTicker value={summary?.totalExtraExpenses || 0} decimalPlaces={2} /></span>
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Net Balance:</span>
                <span className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{isPositive ? '' : '-'}$<NumberTicker value={Math.abs(netBalance)} decimalPlaces={2} /></span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Period Details */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Period Details</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>
                {Math.max(0, Math.ceil(((period.endDate ? new Date(period.endDate) : new Date()).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24)))} days
              </span>
            </div>
            <div className="flex justify-between">
              <span>Carry Forward:</span>
              <span>{summary?.carryForward ? 'Yes' : 'No'}</span>
            </div>
            {period.notes && (
              <div className="pt-2 border-t">
                <span className="font-medium">Notes:</span>
                <p className="text-xs mt-1">{period.notes}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

