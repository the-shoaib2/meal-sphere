import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingSkeletons: React.FC = () => (
  <div className="space-y-3">
    {/* Header skeleton matching VotingSystem */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
      <div>
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex items-center gap-2 mt-3 sm:mt-0">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-32 rounded" />
      </div>
    </div>
    {/* Vote cards skeletons */}
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i} aria-busy="true" aria-label="Loading vote" className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28 mb-1" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-2 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Skeleton className="h-8 w-full rounded" />
          </CardFooter>
        </Card>
      ))}
      <Card aria-busy="true" aria-label="Loading past votes" className="animate-pulse md:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LoadingSkeletons; 