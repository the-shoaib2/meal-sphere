import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

// Meal Card Skeleton
export const MealCardSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-xl bg-card">
    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-0">
      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-20 mb-2" />
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
    <div className="flex items-center justify-end sm:justify-start">
      <Skeleton className="h-8 w-20 sm:h-9 sm:w-24 rounded-full" />
    </div>
  </div>
);

// Meal List Skeleton
export const MealListSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map((typeIndex) => (
      <div key={typeIndex} className="space-y-3">
        <div className="flex items-center gap-3 pb-2 border-b">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-12 ml-auto" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((mealIndex) => (
            <div key={mealIndex} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// User Meal Summary Skeleton
export const UserMealSummarySkeleton = () => (
  <Card className="mb-3">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 rounded-full">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12 ml-auto" />
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center space-y-1 p-2 bg-muted/30 rounded-lg">
            <Skeleton className="h-3 w-12 mx-auto" />
            <Skeleton className="h-5 w-6 mx-auto" />
            <Skeleton className="h-2 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Meal Summary Skeleton
export const MealSummarySkeleton = () => (
  <Card className="mb-3">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 rounded-full">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12 ml-auto" />
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center space-y-1 p-2 bg-muted/30 rounded-lg">
            <Skeleton className="h-3 w-12 mx-auto" />
            <Skeleton className="h-5 w-6 mx-auto" />
            <Skeleton className="h-2 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Meal Management Skeleton (full page skeleton for meal-management.tsx)
export const MealManagementSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
    {/* User Meal Summary Skeleton */}
    <UserMealSummarySkeleton />
    {/* Tabs skeleton */}
    <div className="space-y-4">
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-full max-w-md">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MealCardSkeleton />
              <MealCardSkeleton />
              <MealCardSkeleton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    {/* Meal Summary Skeleton */}
    <MealSummarySkeleton />
  </div>
);

// Export all as default for convenience
export default {
  MealCardSkeleton,
  MealListSkeleton,
  UserMealSummarySkeleton,
  MealManagementSkeleton,
}; 