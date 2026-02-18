"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Calendar, DollarSign, BarChart3, Info, Utensils } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NumberTicker } from '@/components/ui/number-ticker';
import { DashboardChartData } from '@/types/dashboard';
import { useDashboardLoading } from '@/components/dashboard/dashboard';

interface MealChartProps {
  chartData: DashboardChartData[] | undefined;
  isLoading?: boolean;
}

export default function MealChart({ chartData, isLoading: propIsLoading }: MealChartProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { isLoading: contextLoading } = useDashboardLoading();
  const isLoading = propIsLoading || contextLoading;

  const totalMeals = chartData?.reduce((sum, day) => sum + day.meals, 0) || 0;
  const totalExpenses = chartData?.reduce((sum, day) => sum + day.expenses, 0) || 0;
  const daysWithMeals = chartData?.filter(day => day.meals > 0).length || 0;
  const averageMealsPerDay = daysWithMeals > 0 ? (totalMeals / daysWithMeals).toFixed(1) : '0';
  const maxMeals = chartData ? Math.max(...chartData.map(d => d.meals)) : 0;

  if (!isLoading && (!chartData || chartData.length === 0)) {
    return (
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px] shadow-sm bg-card border">
        <CardHeader className="pb-3 sm:pb-4 px-6 sm:px-8 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Monthly Meal Summary</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow">
          <div className="h-[250px] sm:h-[300px] lg:h-[350px] w-full px-4 sm:px-6 flex items-center justify-center bg-muted/20 border border-dashed border-border rounded-xl m-2">
            <div className="text-center space-y-2">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">Chart coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px] shadow-sm bg-card">
        <CardHeader className="pb-3 sm:pb-4 px-6 sm:px-8 pt-6 sm:pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">Monthly Meal Summary</CardTitle>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-full hover:bg-muted/50 transition-colors cursor-help">
                  <Info className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border shadow-xl">
                <p className="font-medium">Hover over bars to see detailed info</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Total', value: totalMeals, color: 'blue', icon: Utensils },
              { label: 'Active', value: daysWithMeals, color: 'green', icon: Calendar },
              { label: 'Avg', value: averageMealsPerDay, color: 'orange', icon: BarChart3 },
              { label: 'Exp', value: `৳${totalExpenses}`, color: 'rose', icon: DollarSign }
            ].map((stat, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-3 group transition-all duration-300 hover:bg-muted/50">
                <div className={`p-2 rounded-full bg-${stat.color}-500/10 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                  {React.createElement(stat.icon, { className: "h-4 w-4" })}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">{stat.label}</span>
                  <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      <NumberTicker value={parseFloat(String(stat.value).replace('৳', '')) || 0} decimalPlaces={stat.label === 'Avg' || stat.label === 'Exp' ? 1 : 0} />
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow">
          {isLoading ? (
            <div className="h-[180px] sm:h-[220px] lg:h-[250px] xl:h-[280px] w-full flex items-end justify-between gap-1 sm:gap-1.5 px-1 py-4">
              {[...Array(30)].map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${Math.random() * 40 + 20}%` }} />
              ))}
            </div>
          ) : chartData ? (
            <ScrollArea className="h-[180px] sm:h-[220px] lg:h-[250px] xl:h-[280px] w-full pr-2">
              <div className="h-full flex items-end justify-between gap-1 sm:gap-1.5 px-1 py-4">
                {chartData.map((day, index) => {
                  const height = maxMeals > 0 ? (day.meals / maxMeals) * 100 : 0;
                  const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                  const isSelected = selectedDay === day.date;

                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center group cursor-pointer" onClick={() => setSelectedDay(isSelected ? null : day.date)}>
                          <div className="relative w-full h-full flex flex-col justify-end">
                            <div
                              className={`w-full transition-all duration-300 rounded-t-md relative ${day.meals > 0
                                ? (isToday
                                  ? 'bg-primary shadow-[0_-4px_12px_rgba(var(--primary),0.3)] scale-x-110 z-10'
                                  : 'bg-primary/40 hover:bg-primary/70 hover:scale-x-105')
                                : 'bg-muted/30'
                                } ${isSelected ? 'scale-x-125 bg-primary/90 ring-2 ring-primary/20 z-10' : ''}`}
                              style={{ height: `${Math.max(height, 8)}%`, minHeight: '6px' }}
                            >
                              {isToday && (
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-background rounded-full shadow-sm animate-pulse" />
                              )}
                            </div>
                          </div>
                          <span className={`text-[8px] sm:text-[10px] font-bold mt-2 transition-colors ${isToday ? 'text-primary scale-110' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover text-popover-foreground border-border shadow-md rounded-lg p-3">
                        <div className="space-y-1.5">
                          <p className="font-bold text-xs text-foreground border-b border-border pb-1 mb-1">
                            {new Date(day.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <p className="text-xs font-medium">Meals: <span className="font-bold">{day.meals}</span></p>
                          </div>
                          {day.expenses > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-rose-500" />
                              <p className="text-xs font-medium">Expenses: <span className="font-bold">৳{day.expenses}</span></p>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </ScrollArea>
          ) : null}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}