"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Utensils,
  CreditCard,
  ShoppingBag,
  Users,
  Receipt,
  User,
  Activity,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

  return (
    <Card className="overflow-hidden h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px] flex flex-col shadow-sm bg-card border">
      <CardHeader className="pb-3 sm:pb-4 px-6 sm:px-8 pt-6 sm:pt-8 z-10 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
              Recent Activities
            </CardTitle>
          </div>
          <Badge variant="secondary" className="bg-muted text-foreground border-0 rounded-full font-bold px-3 py-1 shadow-sm">
            {isLoading ? (
              <Skeleton className="h-4 w-4 bg-primary/10" />
            ) : (
              <NumberTicker value={activities?.length || 0} />
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-grow overflow-hidden bg-card">
        <ScrollArea className="h-full w-full">
          {!isLoading && (!activities || activities.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="p-4 rounded-full bg-muted/30 mb-4">
                <Clock className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No activities yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Activity from your group will appear here.</p>
            </div>
          ) : (
            <div className="px-4 sm:px-6 pb-6 space-y-3 mt-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 w-full">
                  <div className="p-4 rounded-full bg-primary/5 mb-4 animate-pulse">
                    <Activity className="h-8 w-8 text-primary/20" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading activities...</p>
                </div>
              ) : (
                activities?.map((activity: DashboardActivity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  const iconColor = getActivityColor(activity.type);
                  const badge = getActivityBadge(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all duration-300 group shadow-sm"
                    >
                      <div className={cn("h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", iconColor)}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{activity.title}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-medium">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] whitespace-nowrap text-muted-foreground/60 font-medium capitalize">
                            <SafeDate date={activity.timestamp} format={formatActivityTimestamp} />
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", badge.color)}>
                          {badge.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
