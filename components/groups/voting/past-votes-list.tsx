import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Check, Calendar, Clock, Trophy, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { PastVote } from "./types";

interface PastVotesListProps {
  pastVotes: PastVote[];
}

const PastVotesList: React.FC<PastVotesListProps> = ({ pastVotes }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-green-600" />
          <CardTitle>Past Votes</CardTitle>
        </div>
        <CardDescription>Results of previous votes and elections</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pastVotes.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No past votes for this group.</p>
              <p className="text-sm text-muted-foreground">Votes will appear here once they're completed.</p>
            </div>
          ) : (
            pastVotes.map((vote) => (
              <div key={vote.id} className="p-4 rounded-lg border border-border hover:border-border/60 transition-colors">
                {/* Header Section */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="rounded-full bg-green-100 p-2 flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{vote.title}</p>
                        <Badge variant="outline" className="text-xs w-fit bg-green-50 text-green-700 border-green-200">
                          Completed
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Ended: {formatDate(vote.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(vote.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vote Stats */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4 px-2 py-1 bg-muted/30 rounded">
                  <Users className="h-3 w-3" />
                  <span>{vote.totalVotes ?? 0} total votes cast</span>
                </div>

                {/* Winner Section */}
                <div className="border-t pt-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-12 w-12 border-2 border-green-200">
                        <AvatarImage src={vote.winner?.image || "/placeholder.svg"} alt={vote.winner?.name || 'Winner'} />
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {(vote.winner?.name ? vote.winner.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center sm:text-left">
                        <p className="text-sm font-medium text-green-700">Winner</p>
                        <p className="text-xs text-muted-foreground">Vote Results</p>
                      </div>
                    </div>
                    <div className="text-center sm:text-left min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{vote.winner?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {vote.winner ? `${vote.results?.[vote.winner.id]?.length || 0} votes` : 'No winner'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PastVotesList; 