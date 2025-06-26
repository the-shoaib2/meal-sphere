"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDashboardActivities } from '@/hooks/use-dashboard';
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
  const { data: activities, isLoading, error } = useDashboardActivities();

  if (isLoading) {
    return (
      <Card className="h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
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
      <Card className="h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Recent Activities</CardTitle>
          </div>
          <CardDescription>Your recent meal and payment activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] border rounded-md bg-muted/20">
            <div className="text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load activities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="h-[400px] lg:h-[450px] xl:h-[500px]">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Recent Activities</CardTitle>
          </div>
          <CardDescription>Your recent meal and payment activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] border rounded-md bg-muted/20">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activities</p>
              <p className="text-xs text-muted-foreground mt-1">Activities will appear here as they happen</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px] lg:h-[450px] xl:h-[500px]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Recent Activities</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {activities.length} activities
          </Badge>
        </div>
        <CardDescription>Your recent meal and payment activities</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] lg:h-[340px] xl:h-[380px] w-full">
          <div className="space-y-3 pr-4">
            {activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              const iconColor = getActivityColor(activity.type);
              const badge = getActivityBadge(activity.type);
              
              return (
                <div key={activity.id} className="group">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-200">
                    <div className={`rounded-full p-2 border ${iconColor} group-hover:scale-110 transition-transform duration-200`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={activity.user?.image || ''} />
                            <AvatarFallback className="text-xs bg-primary/10">
                              {activity.user?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium leading-none truncate">
                            {activity.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {activity.amount && (
                            <span className="text-sm font-semibold text-primary">
                              ৳{activity.amount.toFixed(2)}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-xs ${badge.color}`}>
                            {badge.text}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(activity.timestamp)}</span>
                      </div>
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