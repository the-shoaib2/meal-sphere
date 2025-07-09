import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleNavigation } from "@/lib/utils";


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
  const router = handleNavigation;
  const isAdmin = userRole && ["ADMIN", "MANAGER", "MEAL_MANAGER"].includes(userRole);

  const handleCreatePeriod = () => {
    if (onCreatePeriod) {
      onCreatePeriod();
    } else {
      handleNavigation("/periods?openCreate=1");
    }
  };

  const handleMessageAdmin = () => {
    if (groupId && userId) {
      handleNavigation(`/messages?groupId=${groupId}&userId=${userId}`);
    } else {
      handleNavigation("/messages");
    }
  };

  return (
    <Card className="w-full  mx-auto mt-8 ">
      <CardHeader className="flex flex-col items-center pb-2">
        <div className="flex items-center justify-center w-full mb-2">
          <span className="p-2 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-green-700" />
          </span>
        </div>
        <CardTitle className="text-lg font-semibold text-center w-full mt-1 text-destructive">No Period Found</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center w-full">
        <div className="text-sm sm:text-base text-muted-foreground mb-4 text-center max-w-sm">
          There is no active period for this group.<br className="hidden sm:block" />
          <span className="text-green-700 font-medium">Periods are required to manage meals, expenses, and payments.</span>
        </div>
        {isAdmin ? (
          <Button
            onClick={handleCreatePeriod}
            disabled={isLoading}
            className="w-full sm:w-auto"
            size="sm"
          >
            Create Period
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span>Contact an admin to create a period</span>
            </div>
            <Button
              onClick={handleMessageAdmin}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-50 w-full sm:w-auto"
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