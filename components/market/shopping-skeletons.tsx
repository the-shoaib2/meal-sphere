import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

export const ShoppingManagementSkeleton = () => (
    <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
        </div>

        {/* Pending Items Skeleton */}
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div>
                                    <Skeleton className="h-4 w-24 mb-1" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Purchased Items Skeleton */}
        <Card className="">
            <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div>
                                    <Skeleton className="h-4 w-20 mb-1" />
                                    <Skeleton className="h-3 w-14" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
);
