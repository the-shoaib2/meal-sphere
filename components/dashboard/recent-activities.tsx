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
            <div className="flex items-center justify-center h-[120px] sm:h-[150px] rounded-xl bg-muted/20 border border-dashed border-border m-4">
              <div className="text-center">
                <div className="p-2.5 rounded-2xl bg-muted/50 w-fit mx-auto mb-2">
                  <Clock className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">No activities yet</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-8 px-4" />
                  <TableHead className="px-2">Activity</TableHead>
                  <TableHead className="px-2 hidden sm:table-cell">Type</TableHead>
                  <TableHead className="px-4 text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell className="px-4 py-3">
                        <Skeleton className="h-7 w-7 rounded-full bg-muted" />
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <Skeleton className="h-3.5 w-28 bg-muted mb-1.5" />
                        <Skeleton className="h-2.5 w-44 bg-muted/50" />
                      </TableCell>
                      <TableCell className="px-2 py-3 hidden sm:table-cell">
                        <Skeleton className="h-5 w-16 rounded-full bg-muted/30" />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Skeleton className="h-3 w-14 bg-muted/30 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                  : activities?.map((activity: DashboardActivity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    const iconColor = getActivityColor(activity.type);
                    const badge = getActivityBadge(activity.type);
                    return (
                      <TableRow key={activity.id} className="border-border/50 hover:bg-accent/50 group">
                        <TableCell className="px-4 py-3">
                          <div className={`p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform w-fit ${iconColor}`}>
                            <IconComponent className="h-3.5 w-3.5" />
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 max-w-[180px]">
                          <p className="text-xs font-semibold leading-tight line-clamp-1 tracking-tight text-foreground">
                            {activity.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed font-medium opacity-80">
                            {activity.description}
                          </p>
                        </TableCell>
                        <TableCell className="px-2 py-3 hidden sm:table-cell">
                          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground/60 font-bold whitespace-nowrap">
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <SafeDate date={activity.timestamp} format={formatActivityTimestamp} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
