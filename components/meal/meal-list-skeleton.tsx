import { Skeleton } from "@/components/ui/skeleton";

const MealListSkeleton = () => (
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

export default MealListSkeleton; 