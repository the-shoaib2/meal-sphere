import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Voter {
  id: string;
  name: string;
  image?: string;
}

interface VoterStackProps {
  voters: Voter[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const VoterStack: React.FC<VoterStackProps> = ({ 
  voters, 
  maxVisible = 5, 
  size = "md",
  className = "" 
}) => {
  if (!voters || voters.length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm", 
    lg: "h-10 w-10 text-base"
  };

  const avatarSize = sizeClasses[size];
  const visibleVoters = voters.slice(0, maxVisible);
  const remainingCount = voters.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        <div className="flex -space-x-2">
          {visibleVoters.map((voter, index) => (
            <Tooltip key={`voter-${voter.id || index}-${index}`}>
              <TooltipTrigger asChild>
                <Avatar className={`${avatarSize} border-2 border-background hover:z-10 transition-all duration-200`}>
                  {voter.image ? (
                    <AvatarImage 
                      src={voter.image} 
                      alt={voter.name} 
                    />
                  ) : (
                    <Skeleton className={`${avatarSize} rounded-full`} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {voter.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{voter.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip key="remaining-count">
              <TooltipTrigger asChild>
                <div className={`${avatarSize} border-2 border-background bg-muted rounded-full flex items-center justify-center text-xs font-medium hover:z-10 transition-all duration-200`}>
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} more voter{remainingCount !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <div className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{voters.length} vote{voters.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default VoterStack; 