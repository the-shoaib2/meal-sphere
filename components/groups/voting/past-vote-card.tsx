import React from "react";
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

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <CardTitle className="text-base">Recent Vote Results</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Ended {formatDistanceToNow(new Date(vote.endDate || ''), { addSuffix: true })}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {vote.title} • {formatDate(vote.startDate)} - {formatDate(vote.endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {Array.isArray((vote as any).options)
            ? ((vote as any).options as Candidate[]).map((candidate) => {
                                 const votersForCandidate = Array.isArray((vote as any).results?.[candidate.id]) ? (vote as any).results[candidate.id] : [];
                 const votesForCandidate = votersForCandidate.length;
                 const isWinner = candidate.id === vote.winner?.id;
                 return (
                   <div key={candidate.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${isWinner ? '' : 'bg-card'}`}>
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                       <AvatarFallback >
                         {(candidate.name ? candidate.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                       </AvatarFallback>
                     </Avatar>
                     <div className="flex-1 min-w-0">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1">
                         <div className="flex items-center gap-2">
                           <p className="text-sm font-medium truncate">{candidate.name}</p>
                           {isWinner && (
                             <Badge variant="default" className="text-xs bg-yellow-600 hover:bg-yellow-700">
                               <Trophy className="mr-1 h-3 w-3" />
                               Winner
                             </Badge>
                           )}
                         </div>
                         <div className="flex items-center gap-1 text-xs text-muted-foreground">
                           <Users className="h-3 w-3 flex-shrink-0" />
                           <span>{votesForCandidate} votes</span>
                         </div>
                       </div>
                       <Progress 
                         value={((votesForCandidate / (activeGroupMembersCount || 1)) * 100)} 
                         className="h-1.5"
                       />
                       <div className="text-xs text-muted-foreground mt-1">
                         {((votesForCandidate / (activeGroupMembersCount || 1)) * 100).toFixed(1)}% of total votes
                       </div>
                       {votesForCandidate > 0 && (
                         <div className="mt-1">
                           <VoterStack 
                             voters={votersForCandidate} 
                             size="sm" 
                             maxVisible={3}
                           />
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })
            : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default PastVoteCard; 