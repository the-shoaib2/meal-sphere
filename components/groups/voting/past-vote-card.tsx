import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Trophy, Users } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Candidate, PastVote, Voter } from "./types";
import VoterStack from "./voter-stack";

interface PastVoteCardProps {
  vote: PastVote;
  activeGroupMembersCount: number;
}

const PastVoteCard: React.FC<PastVoteCardProps> = ({ vote, activeGroupMembersCount }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const options = Array.isArray((vote as any).options) ? (vote as any).options as Candidate[] : [];
  const results = (vote as any).results || {};

  return (
    <Card className="col-span-full overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Recent Vote Results</CardTitle>
              <p className="text-xs text-muted-foreground font-medium">
                {vote.title} • {formatDate(vote.startDate)} - {formatDate(vote.endDate)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold tracking-wider bg-background/50">
            <Clock className="mr-1.5 h-3 w-3" />
            Ended {formatDistanceToNow(new Date(vote.endDate || ''), { addSuffix: true })}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        <div className="grid gap-2.5">
          {options.map((candidate) => {
            const votersForCandidate = Array.isArray(results[candidate.id]) ? results[candidate.id] : [];
            const votesForCandidate = votersForCandidate.length;
            const isWinner = candidate.id === vote.winner?.id;
            const percentage = ((votesForCandidate / (activeGroupMembersCount || 1)) * 100);

            return (
              <div
                key={candidate.id}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200",
                  isWinner ? "border-primary/30 bg-muted/50" : "border-muted/50 bg-background/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className={cn(
                    "h-10 w-10 border-2",
                    isWinner ? "border-primary/50 shadow-sm shadow-primary/20" : "border-background"
                  )}>
                    <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                    <AvatarFallback className={cn(
                      "font-bold",
                      isWinner ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {(candidate.name ? candidate.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-bold truncate">{candidate.name}</p>
                        {isWinner && (
                          <Badge className="text-[9px] h-4 uppercase font-black px-1.5">
                            Winner
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-bold">{votesForCandidate}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>

                    <Progress
                      value={percentage}
                      className={cn(
                        "h-1.5",
                        isWinner ? "bg-primary/20 [&>div]:bg-primary" : "bg-muted [&>div]:bg-muted-foreground/30"
                      )}
                    />

                    {votesForCandidate > 0 && (
                      <div className="mt-2.5">
                        <VoterStack
                          voters={votersForCandidate}

                          maxVisible={4}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PastVoteCard;
