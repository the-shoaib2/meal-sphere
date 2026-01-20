import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const ExpensesLoadingSkeleton = () => (
    <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-32 rounded-md" />
            </div>
        </div>

        {/* Filters Card Skeleton */}
        <Card>
            <CardHeader className="pb-3 sm:pb-4">
                <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                        <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                        <Skeleton className="h-9 sm:h-10 w-full" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                        <Skeleton className="h-9 sm:h-10 w-full" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 sm:col-span-2 lg:col-span-1">
                        <Skeleton className="h-3 sm:h-4 w-10 sm:w-12" />
                        <Skeleton className="h-9 sm:h-10 w-full" />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Expenses Table Skeleton */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4">
                <div className="space-y-1.5 sm:space-y-2">
                    <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
                        <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-md border">
                    <div className="p-3 sm:p-4">
                        <div className="space-y-3 sm:space-y-4">
                            {/* Table Header Skeleton - Desktop */}
                            <div className="hidden sm:grid sm:grid-cols-7 gap-3 sm:gap-4 pb-2 border-b">
                                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                            </div>

                            {/* Table Rows Skeleton */}
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="grid grid-cols-7 gap-3 sm:gap-4 py-2 sm:py-3 border-b last:border-b-0">
                                    <Skeleton className="h-4 w-24 sm:w-32" />
                                    <Skeleton className="h-5 sm:h-6 w-12 sm:w-16 rounded-full" />
                                    <Skeleton className="h-4 w-16 sm:w-20" />
                                    <Skeleton className="h-4 w-20 sm:w-24" />
                                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                                        <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
                                        <Skeleton className="h-4 w-16 sm:w-20" />
                                    </div>
                                    <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
                                    <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
);
