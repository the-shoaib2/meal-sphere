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

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch {
      return '';
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
    <Card >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">{vote.title}</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 w-fit">
            Completed
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Started: {formatDate(vote.startDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Ended: {formatDate(vote.endDate)}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {vote.endDate && `Completed ${formatTimeAgo(vote.endDate)}`}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.isArray((vote as any).options)
            ? ((vote as any).options as Candidate[]).map((candidate) => {
                                 const votersForCandidate = Array.isArray((vote as any).results?.[candidate.id]) ? (vote as any).results[candidate.id] : [];
                 const votesForCandidate = votersForCandidate.length;
                 const isWinner = candidate.id === vote.winner?.id;
                 return (
                   <div key={candidate.id} className={`flex items-center gap-3 transition-colors`}>
                     <Avatar className="h-10 w-10">
                       <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                       <AvatarFallback >
                         {(candidate.name ? candidate.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                       </AvatarFallback>
                     </Avatar>
                     <div className="flex-1 min-w-0">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
                         <div className="text-sm font-medium flex items-center gap-2 truncate">
                           {candidate.name}
                           {isWinner && (
                             <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs flex-shrink-0">
                               <Trophy className="h-3 w-3 mr-1" />
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
                         className={`h-2 ${isWinner ? 'bg-green-100' : ''}`}
                       />
                       {votesForCandidate > 0 && (
                         <div className="mt-2">
                           <VoterStack 
                             voters={votersForCandidate} 
                             size="sm" 
                             maxVisible={4}
                           />
                         </div>
                       )}
                     </div>
                   </div>
                 );
              })
            : (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={vote.winner?.image || "/placeholder.svg"} alt={vote.winner?.name || 'Winner'} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {(vote.winner?.name ? vote.winner.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                  </AvatarFallback>
                </Avatar>
                <div>
                                     <div className="text-sm font-medium flex items-center gap-2">
                     {vote.winner?.name ?? 'Unknown'}
                     <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                       <Trophy className="h-3 w-3 mr-1" />
                       Winner
                     </Badge>
                   </div>
                   <div className="text-xs text-muted-foreground flex items-center gap-1">
                     <Users className="h-3 w-3" />
                     {vote.totalVotes ?? 0} total votes
                   </div>
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PastVoteCard; 