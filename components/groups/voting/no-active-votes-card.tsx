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
  <Card className="md:col-span-2 border-dashed shadow-sm">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Vote className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold">No Active Votes</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-sm">
        There are no active votes in this group at the moment.
        {isMember && (
          <span className="block mt-1">
            Create a new vote to get started with group decisions.
          </span>
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button variant="outline" onClick={handleRefreshVotes} className="w-full sm:w-auto group">
          <RotateCcw className="mr-2 h-4 w-4 group-active:animate-spin" />
          Refresh
        </Button>
        {/* {isMember && (
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Vote
          </Button>
        )} */}
      </div>
    </CardContent>
  </Card>
);

export default NoActiveVotesCard; 