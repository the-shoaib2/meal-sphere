'use client';

import React from 'react';
import { Calendar, Utensils, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodSummaryCard } from './period-summary-card';
import { PeriodStatus, MealPeriod } from '@prisma/client';
import { NumberTicker } from '@/components/ui/number-ticker';

interface PeriodOverviewSectionProps {
  periods: MealPeriod[];
  currentPeriod: any;
  selectedPeriod: any;
  periodSummary: any;
  activeGroup: any;
}

export function PeriodOverviewSection({
  periods,
  currentPeriod,
  selectedPeriod,
  periodSummary,
  activeGroup,
}: PeriodOverviewSectionProps) {
  return (
    <div className="space-y-4">
      {/* Period Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Periods</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold"><NumberTicker value={periods?.length || 0} /></div>
            <p className="text-xs text-muted-foreground">
              <NumberTicker value={periods?.filter((p: MealPeriod) => p.status === PeriodStatus.ACTIVE).length || 0} /> active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Current Period Meals</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              <NumberTicker value={currentPeriod ? (periodSummary?.totalMeals || 0) : 0} />
            </div>
            <p className="text-xs text-muted-foreground">
              <NumberTicker value={currentPeriod ? (periodSummary?.totalGuestMeals || 0) : 0} /> guest meals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Current Period Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              $<NumberTicker value={currentPeriod ? (periodSummary?.totalShoppingAmount || 0) : 0} decimalPlaces={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              + $<NumberTicker value={currentPeriod ? (periodSummary?.totalExtraExpenses || 0) : 0} decimalPlaces={2} /> extra
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Current Period Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              $<NumberTicker value={currentPeriod ? (periodSummary?.totalPayments || 0) : 0} decimalPlaces={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              <NumberTicker value={activeGroup?.members?.length || 0} /> active members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Selected Period Details */}
      {selectedPeriod && (
        <div className="grid gap-4 md:grid-cols-1">
          <PeriodSummaryCard period={selectedPeriod} summary={periodSummary ?? undefined} />
        </div>
      )}

      {/* No Period Selected State */}
      {!selectedPeriod && periods && periods.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">Select a Period</h3>
              <p className="text-xs sm:text-muted-foreground">
                Choose a period from the "All Periods" tab to view detailed information and member breakdowns.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 