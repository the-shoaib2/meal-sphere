'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar, Users, DollarSign, Utensils, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeriodSummary } from '@/hooks/use-periods';
import { PeriodStatus } from '@prisma/client';


interface PeriodSummaryCardProps {
  period: any;
  summary?: PeriodSummary;
}

export function PeriodSummaryCard({ period, summary }: PeriodSummaryCardProps) {
  if (!period) return null;

  const getStatusBadge = () => {
        return <Badge variant="default">Active</Badge>;
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
              {format(new Date(period.startDate), 'MMM dd, yyyy')} - {format(new Date(period.endDate), 'MMM dd, yyyy')}
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
            <div className="text-2xl font-bold">{summary?.totalMeals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.totalGuestMeals || 0} guest meals
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Members</span>
            </div>
            <div className="text-2xl font-bold">{summary?.memberCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.activeMemberCount || 0} active
            </p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Financial Summary</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Opening Balance:</span>
              <span className="font-medium">${(summary?.openingBalance || 0).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Total Payments:</span>
              <span className="font-medium text-green-600">+${(summary?.totalPayments || 0).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Shopping Expenses:</span>
              <span className="font-medium text-red-600">-${(summary?.totalShoppingAmount || 0).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Extra Expenses:</span>
              <span className="font-medium text-red-600">-${(summary?.totalExtraExpenses || 0).toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Net Balance:</span>
                <span className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>${Math.abs(netBalance).toFixed(2)}</span>
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
                {Math.ceil((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
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

 