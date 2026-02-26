"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
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
              <div className="p-2 rounded-full bg-primary/10">
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
      <Card className="h-[320px] sm:h-[360px] lg:h-[400px] xl:h-[440px] shadow-sm bg-card">
        <CardHeader className="pb-2 sm:pb-3 px-6 sm:px-8 pt-6 sm:pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground">Monthly Meal Summary</CardTitle>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-full hover:bg-muted/50 transition-colors cursor-help">
                  <Info className="h-4 w-4 text-muted-foreground/30" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border shadow-xl">
                <p className="font-medium text-xs">Hover over bars to see detailed info</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Total', value: totalMeals, color: 'amber', icon: Utensils },
              { label: 'Active', value: daysWithMeals, color: 'emerald', icon: Calendar },
              { label: 'Avg', value: averageMealsPerDay, color: 'blue', icon: BarChart3 },
              { label: 'Exp', value: `৳${totalExpenses}`, color: 'rose', icon: DollarSign }
            ].map((stat, i) => (
              <div key={i} className="p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/50 flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 group transition-all duration-300 hover:bg-muted/50">
                <div className={`p-1.5 rounded-full bg-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color === 'blue' ? 'blue' : 'rose'}-500/10 text-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color === 'blue' ? 'blue' : 'rose'}-600 dark:text-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color === 'blue' ? 'blue' : 'rose'}-500`}>
                  {React.createElement(stat.icon, { className: "h-3.5 w-3.5" })}
                </div>
                <div className="flex flex-col flex-1 text-center sm:text-left">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">{stat.label}</span>
                  <span className="text-xs sm:text-sm font-black tracking-tighter text-foreground leading-none mt-0.5">
                    {isLoading ? (
                      <span className="text-muted-foreground/30">...</span>
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
            <div className="h-[140px] sm:h-[180px] lg:h-[200px] xl:h-[230px] w-full flex items-center justify-center">
              <Loader />
            </div>
          ) : chartData ? (
            <div className="h-[120px] sm:h-[160px] lg:h-[180px] xl:h-[210px] w-full overflow-x-auto scrollbar-none">
              <div className="h-full flex items-end justify-between gap-1 sm:gap-1.5 px-1 py-2 min-w-0">
                {chartData.map((day, index) => {
                  const height = maxMeals > 0 ? (day.meals / maxMeals) * 100 : 0;
                  const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                  const isSelected = selectedDay === day.date;

                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center group cursor-pointer" onClick={() => setSelectedDay(isSelected ? null : day.date)}>
                          <div className="relative w-full flex flex-col justify-end" style={{ height: '100%' }}>
                            <div
                              className={`w-full transition-all duration-300 rounded-t-lg relative ${day.meals > 0
                                ? (isToday
                                  ? 'bg-primary shadow-[0_-4px_16px_rgba(var(--primary),0.4)] scale-x-110 z-10'
                                  : 'bg-primary/30 hover:bg-primary/60 hover:scale-x-105')
                                : 'bg-muted/20'
                                } ${isSelected ? 'scale-x-110 bg-primary/80 ring-2 ring-primary/20 z-10' : ''}`}
                              style={{ height: `${Math.max(height, 5)}%`, minHeight: '4px' }}
                            >
                              {isToday && (
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-background rounded-full shadow-lg border border-primary animate-pulse" />
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
            </div>
          ) : null}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}