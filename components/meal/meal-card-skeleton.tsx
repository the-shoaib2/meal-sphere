import { Skeleton } from "@/components/ui/skeleton";

const MealCardSkeleton = () => (
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

export default MealCardSkeleton; 