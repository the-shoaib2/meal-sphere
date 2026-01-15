"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDashboardContext } from '@/contexts/dashboard-context';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'MEAL':
      return Utensils;
    case 'PAYMENT':
      return CreditCard;
    case 'SHOPPING':
      return ShoppingBag;
    case 'EXPENSE':
      return Receipt;
    case 'ACTIVITY':
      return Users;
    default:
      return User;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'MEAL':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'PAYMENT':
      return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'SHOPPING':
      return 'text-purple-600 bg-purple-100 border-purple-200';
    case 'EXPENSE':
      return 'text-red-600 bg-red-100 border-red-200';
    case 'ACTIVITY':
      return 'text-orange-600 bg-orange-100 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

const getActivityBadge = (type: string) => {
  switch (type) {
    case 'MEAL':
      return { text: 'Meal', color: 'bg-green-100 text-green-800' };
    case 'PAYMENT':
      return { text: 'Payment', color: 'bg-blue-100 text-blue-800' };
    case 'SHOPPING':
      return { text: 'Shopping', color: 'bg-purple-100 text-purple-800' };
    case 'EXPENSE':
      return { text: 'Expense', color: 'bg-red-100 text-red-800' };
    case 'ACTIVITY':
      return { text: 'Activity', color: 'bg-orange-100 text-orange-800' };
    default:
      return { text: 'Other', color: 'bg-gray-100 text-gray-800' };
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

export default function RecentActivities() {
  const { activities, isLoading, error } = useDashboardContext();

  if (isLoading) {
    return (
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
          </div>
          <Skeleton className="h-3 sm:h-4 w-36 sm:w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full mr-2 sm:mr-3" />
                <div className="space-y-1.5 sm:space-y-2 flex-1">
                  <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32" />
                  <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Recent Activities</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">Your recent meal and payment activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] sm:h-[300px] border rounded-md bg-muted/20">
            <div className="text-center">
              <Activity className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">Failed to load activities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Recent Activities</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">Your recent meal and payment activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] sm:h-[300px] border rounded-md bg-muted/20">
            <div className="text-center">
              <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">No recent activities</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Activities will appear here as they happen</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px] flex flex-col">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 border-b z-10 bg-background/95 backdrop-blur-sm sticky top-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">
              Recent Activities
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Latest updates from your meal group
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
            {activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              const iconColor = getActivityColor(activity.type);
              const badge = getActivityBadge(activity.type);

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div className={`p-1.5 sm:p-2 rounded-full ${iconColor.split(' ')[0]}/10`}>
                      <IconComponent className={`h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 ${iconColor.split(' ')[0]}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-medium leading-tight line-clamp-1 text-ellipsis">
                        {activity.title}
                      </p>
                      <Badge variant="outline" className={`text-[10px] sm:text-xs ${badge.color} px-1.5 py-0.5`}>
                        {badge.text}
                      </Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span>{formatTimestamp(activity.timestamp)}</span>
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