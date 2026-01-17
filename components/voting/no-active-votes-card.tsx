import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote, Plus, RotateCcw } from "lucide-react";

interface NoActiveVotesCardProps {
  handleRefreshVotes: () => void;
  isMember: boolean;
  setShowCreateDialog: (open: boolean) => void;
}

const NoActiveVotesCard: React.FC<NoActiveVotesCardProps> = ({ handleRefreshVotes, isMember, setShowCreateDialog }) => (
  <Card className="md:col-span-2">
    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-primary/10 p-3 mb-4">
        <Vote className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-medium">No Active Votes</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-4 max-w-md">
        There are no active votes in this room at the moment.
        {isMember && (
          <span className="block mt-1 text-xs text-muted-foreground">
            You can create a new vote to get started.
          </span>
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button variant="outline" onClick={handleRefreshVotes} className="w-full sm:w-auto">
          <RotateCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        {isMember && (
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Vote
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

export default NoActiveVotesCard; 