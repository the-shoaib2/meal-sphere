"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDashboardChartData } from '@/hooks/use-dashboard';
import { TrendingUp, Calendar, DollarSign, BarChart3, Info, Smartphone } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MealChart() {
  const { data: chartData, isLoading, error } = useDashboardChartData();
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);


  if (error) {
    return (
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Monthly Meal Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] sm:h-[300px] border rounded-md bg-muted/20">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">Failed to load chart data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="h-full min-h-[350px] sm:min-h-[400px] max-h-[500px] sm:max-h-[550px] lg:max-h-[600px] overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">
                Monthly Meal Summary
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary/80"></div>
                <span>Meals</span>
              </div>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-secondary-foreground/50"></div>
                <span>Average</span>
              </div>
            </div>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Your meal consumption over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-2">
          <div className="h-[250px] sm:h-[300px] lg:h-[350px] w-full px-2 sm:px-3 lg:px-4">
            <div className="h-full w-full border rounded-lg bg-muted/5 p-2 sm:p-3 lg:p-4">
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Chart coming soon</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                    Interactive meal chart will be displayed here
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mt-3 sm:mt-4 px-2 sm:px-3 lg:px-4">
            <div className="p-2 sm:p-3 rounded-lg border bg-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Total Meals</p>
              <p className="text-base sm:text-lg lg:text-xl font-semibold mt-1">24</p>
              <p className="text-[10px] sm:text-xs text-green-600 mt-0.5">+2 from last month</p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg border bg-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Daily Avg</p>
              <p className="text-base sm:text-lg lg:text-xl font-semibold mt-1">2.8</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">meals/day</p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg border bg-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Most Active</p>
              <p className="text-base sm:text-lg lg:text-xl font-semibold mt-1">Dinner</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">8:15 PM avg</p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg border bg-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Favorite Meal</p>
              <p className="text-base sm:text-lg lg:text-xl font-semibold mt-1">Chicken</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">6 times this month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for display
  const totalMeals = chartData.reduce((sum, day) => sum + day.meals, 0);
  const totalExpenses = chartData.reduce((sum, day) => sum + day.expenses, 0);
  const daysWithMeals = chartData.filter(day => day.meals > 0).length;
  const averageMealsPerDay = daysWithMeals > 0 ? (totalMeals / daysWithMeals).toFixed(1) : '0';
  const maxMeals = Math.max(...chartData.map(d => d.meals));

  // Get selected day data
  const selectedDayData = selectedDay ? chartData.find(day => day.date === selectedDay) : null;

  return (
    <TooltipProvider>
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-sm sm:text-base lg:text-lg lg:text-xl">Monthly Meal Summary</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground md:hidden" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hover over bars to see detailed information</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Responsive stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4 text-xs sm:text-sm">
            <Card className="p-2 border-0 bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="min-w-0">
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Total:</span>
                  <span className="font-semibold block truncate text-xs sm:text-sm">{totalMeals}</span>
                </div>
              </div>
            </Card>
            <Card className="p-2 border-0 bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="min-w-0">
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Active:</span>
                  <span className="font-semibold block truncate text-xs sm:text-sm">{daysWithMeals}</span>
                </div>
              </div>
            </Card>
            <Card className="p-2 border-0 bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="min-w-0">
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Avg:</span>
                  <span className="font-semibold block truncate text-xs sm:text-sm">{averageMealsPerDay}</span>
                </div>
              </div>
            </Card>
            <Card className="p-2 border-0 bg-muted/50">
              <div className="flex items-center gap-2">
                <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Exp:</span>
                  <span className="font-semibold block truncate text-xs sm:text-sm">৳{totalExpenses.toFixed(0)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Selected day info for mobile */}
          {selectedDayData && (
            <Card className="mt-2 sm:mt-3 border-0 bg-muted/50">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm">
                      {new Date(selectedDayData.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {selectedDayData.meals} meals
                      {selectedDayData.expenses > 0 && ` • ৳${selectedDayData.expenses.toFixed(2)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {new Date(selectedDayData.date).toDateString() === new Date().toDateString() ? 'Today' : 'Selected'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </CardHeader>
        
        <CardContent className="p-3 sm:p-4">
          <ScrollArea className="h-[220px] sm:h-[250px] lg:h-[280px] xl:h-[320px] w-full">
            <div className="h-full w-full">
              {/* Simple and reliable chart implementation */}
              <div className="h-full flex flex-col">
                {/* Chart bars container */}
                <div className="flex-1 flex items-end justify-between gap-0.5 sm:gap-1 px-1 sm:px-2 pb-6 sm:pb-8" style={{ minHeight: '140px' }}>
                  {chartData.map((day, index) => {
                    const height = maxMeals > 0 ? (day.meals / maxMeals) * 100 : 0;
                    const hasMeals = day.meals > 0;
                    const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                    const isSelected = selectedDay === day.date;
                    
                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div 
                            className="flex-1 flex flex-col items-center group relative cursor-pointer"
                            onMouseEnter={() => setHoveredDay(day.date)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
                          >
                            {/* Bar container */}
                            <div className="relative w-full h-full flex flex-col justify-end">
                              {/* Bar */}
                              <div 
                                className={`w-full transition-all duration-300 rounded-t hover:shadow-lg ${
                                  hasMeals 
                                    ? isToday
                                      ? 'bg-gradient-to-t from-primary to-primary/60 ring-2 ring-primary/30'
                                      : isSelected
                                        ? 'bg-gradient-to-t from-primary/90 to-primary/50 ring-2 ring-primary/20'
                                        : 'bg-gradient-to-t from-primary/80 to-primary/40 hover:from-primary hover:to-primary/60' 
                                    : 'bg-muted/30'
                                } ${hoveredDay === day.date ? 'scale-105' : ''} ${isSelected ? 'scale-110' : ''}`}
                                style={{ 
                                  height: `${Math.max(height, 2)}%`,
                                  minHeight: '3px'
                                }}
                              />
                              
                              {/* Meal count label */}
                              {hasMeals && (
                                <div className={`absolute -top-5 sm:-top-6 left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs font-medium transition-opacity ${
                                  hoveredDay === day.date || isSelected ? 'opacity-100' : 'opacity-0'
                                }`}>
                                  {day.meals}
                                </div>
                              )}
                            </div>
                            
                            {/* Date label */}
                            <div className={`text-[10px] sm:text-xs font-medium mt-1 transition-colors ${
                              isToday ? 'text-primary font-bold' : 
                              isSelected ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              {new Date(day.date).getDate()}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-xs sm:text-sm">
                              {new Date(day.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-xs sm:text-sm">Meals: {day.meals}</p>
                            {day.expenses > 0 && (
                              <p className="text-xs sm:text-sm">Expenses: ৳{day.expenses.toFixed(2)}</p>
                            )}
                            {isToday && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs">Today</Badge>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 text-[10px] sm:text-xs pt-3 sm:pt-4 border-t">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-t from-primary/80 to-primary/40 rounded"></div>
                    <span className="text-muted-foreground">Meals</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-muted/30 rounded"></div>
                    <span className="text-muted-foreground">No meals</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded ring-2 ring-primary/30"></div>
                    <span className="text-muted-foreground">Today</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary/90 rounded ring-2 ring-primary/20"></div>
                    <span className="text-muted-foreground">Selected</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
} 