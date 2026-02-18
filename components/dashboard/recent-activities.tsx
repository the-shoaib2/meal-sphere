"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Utensils,
  CreditCard,
  ShoppingBag,
  Users,
  Receipt,
  User,
  Activity,
  Clock
} from 'lucide-react';
import { SafeDate } from '@/components/shared/safe-date';
import { useDashboardLoading } from '@/components/dashboard/dashboard';
import { NumberTicker } from '@/components/ui/number-ticker';
import { DashboardActivity } from '@/types/dashboard';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'MEAL': return Utensils;
    case 'PAYMENT': return CreditCard;
    case 'SHOPPING': return ShoppingBag;
    case 'EXPENSE': return Receipt;
    case 'ACTIVITY': return Users;
    default: return User;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'MEAL': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
    case 'PAYMENT': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
    case 'SHOPPING': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20';
    case 'EXPENSE': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
    case 'ACTIVITY': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20';
    default: return 'text-muted-foreground bg-muted border-border';
  }
};

const getActivityBadge = (type: string) => {
  switch (type) {
    case 'MEAL': return { text: 'Meal', color: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' };
    case 'PAYMENT': return { text: 'Payment', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' };
    case 'SHOPPING': return { text: 'Shopping', color: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300' };
    case 'EXPENSE': return { text: 'Expense', color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300' };
    case 'ACTIVITY': return { text: 'Activity', color: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300' };
    default: return { text: 'Other', color: 'bg-muted text-muted-foreground' };
  }
};

const formatActivityTimestamp = (date: Date) => {
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInHours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

interface RecentActivitiesProps {
  activities: DashboardActivity[] | undefined;
  isLoading?: boolean;
}

export default function RecentActivities({ activities, isLoading: propIsLoading }: RecentActivitiesProps) {
  const { isLoading: contextLoading } = useDashboardLoading();
  const isLoading = propIsLoading || contextLoading;

  if (!isLoading && (!activities || activities.length === 0)) {
    return (
      <Card className="overflow-hidden h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px] flex flex-col shadow-sm bg-card border">
        <CardHeader className="pb-3 sm:pb-4 px-6 sm:px-8 pt-6 sm:pt-8 z-10 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Recent Activities</CardTitle>
              </div>
            </div>
            <Badge variant="secondary" className="bg-muted text-foreground border-0 rounded-full font-bold px-3 py-1 shadow-sm">
              <NumberTicker value={0} />
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-hidden px-2 bg-card">
          <div className="flex items-center justify-center h-[120px] sm:h-[150px] rounded-xl bg-muted/20 border border-dashed border-border m-2">
            <div className="text-center">
              <div className="p-2.5 rounded-2xl bg-muted/50 w-fit mx-auto mb-2">
                <Clock className="h-5 w-5 text-muted-foreground/30" />
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground">No activities yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px] flex flex-col shadow-sm bg-card">
      <CardHeader className="pb-3 sm:pb-4 px-6 sm:px-8 pt-6 sm:pt-8 z-10 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">Recent Activities</CardTitle>
            </div>
          </div>
          <Badge variant="secondary" className="bg-muted text-foreground border-0 rounded-full font-bold px-3 py-1 shadow-sm">
            {isLoading ? <Skeleton className="h-4 w-4 bg-primary/10" /> : <NumberTicker value={activities?.length || 0} />}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden px-2 bg-card">
        <ScrollArea className="h-full w-full pr-2">
          <div className="space-y-2 p-2 sm:p-4 pb-10">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-card transition-all duration-300 border border-border/50">
                  <div className="flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted shadow-sm" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-3.5 w-1/3 bg-muted" />
                      <Skeleton className="h-3 w-10 rounded-full bg-muted/30" />
                    </div>
                    <Skeleton className="h-2.5 w-3/4 bg-muted/50 mt-1" />
                  </div>
                </div>
              ))
            ) : activities?.map((activity: DashboardActivity) => {
              const IconComponent = getActivityIcon(activity.type);
              const iconColor = getActivityColor(activity.type);
              const badge = getActivityBadge(activity.type);

              // Extract the base color name for dynamic classes if needed, 
              // but we are using exact classes returned by helper now.
              // We'll trust the helper classes.

              return (
                <div key={activity.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-card hover:bg-accent/50 transition-all duration-300 group hover:shadow-sm border border-border/50 hover:border-border">
                  <div className="flex-shrink-0">
                    <div className={`p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform ${iconColor}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold leading-tight line-clamp-1 tracking-tight text-foreground">{activity.title}</p>
                      <span className={`text-[8px] uppercase font-bold tracking-widest px-1.5 py-0 rounded-full ${badge.color}`}>{badge.text}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed font-medium opacity-80">{activity.description}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40 mt-1 font-bold">
                      <Clock className="h-2.5 w-2.5" />
                      <SafeDate date={activity.timestamp} format={formatActivityTimestamp} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
