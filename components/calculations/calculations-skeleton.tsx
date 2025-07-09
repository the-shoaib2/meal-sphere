"use client"

import { useMemo, memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// Memoized skeleton component
const CalculationsSkeleton = memo(() => {
  const skeletonRows = useMemo(() => [...Array(5)], [])
  const skeletonCards = useMemo(() => [...Array(3)], [])
  
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="border rounded-lg p-6">
        <div className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="text-lg font-semibold">
              <Skeleton className="h-6 w-32 mb-1" />
            </div>
            <div className="text-sm text-muted-foreground">
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {skeletonCards.map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center rounded-lg border p-3">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Skeleton className="h-8 w-full mb-2" />
            {skeletonRows.map((_, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

CalculationsSkeleton.displayName = "CalculationsSkeleton"

export default CalculationsSkeleton 