import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

const UserMealSummarySkeleton = () => (
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

export default UserMealSummarySkeleton; 