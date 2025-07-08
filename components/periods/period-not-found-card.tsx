import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PeriodNotFoundCardProps {
  userRole?: string | null;
  isLoading?: boolean;
  onCreatePeriod?: () => void;
  groupId?: string;
  userId?: string;
}

export const PeriodNotFoundCard: React.FC<PeriodNotFoundCardProps> = ({ 
  userRole, 
  isLoading, 
  onCreatePeriod, 
  groupId, 
  userId 
}) => {
  const router = useRouter();
  const isAdmin = userRole && ["ADMIN", "MANAGER", "MEAL_MANAGER"].includes(userRole);

  const handleCreatePeriod = () => {
    if (onCreatePeriod) {
      onCreatePeriod();
    } else {
      router.push("/periods?openCreate=1");
    }
  };

  const handleMessageAdmin = () => {
    if (groupId && userId) {
      router.push(`/messages?groupId=${groupId}&userId=${userId}`);
    } else {
      router.push("/messages");
    }
  };

  return (
    <Card className="max-w-md w-full mx-auto mt-6 border-0 shadow-md bg-muted p-0 sm:p-0">
      <CardHeader className="pb-2 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 w-full justify-center">
          <div className="p-2 bg-gradient-to-br from-green-200 to-green-300 rounded-full shadow-sm flex items-center justify-center">
            <Users className="h-6 w-6 text-green-700" />
          </div>
        </div>
        <CardTitle className="text-lg font-semibold text-center w-full mt-2 text-red-600">No Period Found</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center w-full">
        <div className="text-sm sm:text-base text-muted-foreground mb-4 text-center max-w-sm">
          There is no active period for this group.<br className="hidden sm:block" />
          <span className="text-green-700 font-medium">Periods are required to manage meals, expenses, and payments.</span>
        </div>
        {isAdmin ? (
          <Button
            onClick={handleCreatePeriod}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-6 py-1.5 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base"
          >
            Create Period
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span>Contact an admin to create a period</span>
            </div>
            <Button
              onClick={handleMessageAdmin}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-300 hover:bg-green-50 font-medium px-4 py-1.5 rounded-md transition-all duration-200 text-sm"
            >
              Message Admin
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PeriodNotFoundCard; 