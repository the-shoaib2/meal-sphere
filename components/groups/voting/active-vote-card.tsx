import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Vote, Loader2, Calendar, Users, Timer, Plus, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import { Candidate, ActiveVote, Voter } from "./types";
import VoterStack from "./voter-stack";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu as CandidateDropdownMenu, DropdownMenuTrigger as CandidateDropdownMenuTrigger, DropdownMenuContent as CandidateDropdownMenuContent, DropdownMenuItem as CandidateDropdownMenuItem } from "@/components/ui/dropdown-menu";
import EditVoteDialog from "./edit-vote-dialog";

interface ActiveVoteCardProps {
  vote: ActiveVote;
  totalMembers: number;
  options: Candidate[];
  results: Record<string, Voter[]>;
  showVoteDialog: boolean;
  setShowVoteDialog: (open: boolean) => void;
  selectedCandidate: string;
  setSelectedCandidate: (id: string) => void;
  handleVote: (voteId: string) => void;
  isSubmitting: boolean;
  hasVoted: (vote: ActiveVote) => boolean;
  isAdmin?: boolean;
  currentUserId?: string;
  refreshVotes?: () => void;
  candidateOptions: Candidate[];
  voteTypeOptions: { value: string; label: string; backend: string }[];
}

const ActiveVoteCard: React.FC<ActiveVoteCardProps> = ({
  vote,
  totalMembers,
  options,
  results,
  showVoteDialog,
  setShowVoteDialog,
  selectedCandidate,
  setSelectedCandidate,
  handleVote,
  isSubmitting,
  hasVoted,
  isAdmin = false,
  currentUserId,
  refreshVotes,
  candidateOptions,
  voteTypeOptions,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

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

  const formatTimeLeft = (endDate?: string) => {
    if (!endDate) return '';
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) return 'Ended';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `${days}d ${hours}h left`;
      if (hours > 0) return `${hours}h ${minutes}m left`;
      return `${minutes}m left`;
    } catch {
      return '';
    }
  };

  const isExpiringSoon = (endDate?: string) => {
    if (!endDate) return false;
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      // Return true if less than 1 hour remaining
      return diff > 0 && diff < 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const totalVotes = vote.totalVotes || 0;
  const timeLeft = formatTimeLeft(vote.endDate);

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${vote.roomId}/votes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId: vote.id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vote deleted.");
        refreshVotes && refreshVotes();
      } else {
        toast.error(data.error || "Failed to delete vote.");
      }
    } catch (err) {
      toast.error("Failed to delete vote.");
    } finally {
      setActionLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleEditSave = async ({ type, candidates }: { type: string; candidates: Candidate[] }) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/groups/${vote.roomId}/votes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId: vote.id, type, candidates })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vote updated.");
        refreshVotes && refreshVotes();
        setEditOpen(false);
      } else {
        toast.error(data.error || "Failed to update vote.");
      }
    } catch (err) {
      toast.error("Failed to update vote.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Vote className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{vote.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isExpiringSoon(vote.endDate) ? "destructive" : "secondary"} className="w-fit text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {isExpiringSoon(vote.endDate) ? "Expiring Soon" : "Active"}
            </Badge>
            {(isAdmin || vote.userId === currentUserId) && (
              <div className="z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditOpen(true)} disabled={actionLoading}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)} disabled={actionLoading}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Edit Dialog */}
                <EditVoteDialog
                  open={editOpen}
                  onOpenChange={setEditOpen}
                  vote={vote}
                  onSave={handleEditSave}
                  loading={editLoading}
                  candidateOptions={candidateOptions}
                  voteTypeOptions={voteTypeOptions}
                />
                {/* Delete Alert Dialog */}
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Vote</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this vote? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="outline">Cancel</Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Delete
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Started: {formatDate(vote.startDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              <span>Ends: {formatDate(vote.endDate)}</span>
            </div>
          </div>
          {timeLeft && (
            <div className={`text-xs font-medium flex items-center gap-1 ${isExpiringSoon(vote.endDate) ? 'text-orange-600' : 'text-primary'
              }`}>
              <Clock className="h-3 w-3" />
              {timeLeft}
              {isExpiringSoon(vote.endDate) && (
                <span className="ml-1 text-xs">(Expiring soon!)</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Vote Progress</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {totalVotes} / {totalMembers} members have voted
            </div>
          </div>
          <div className="space-y-2">
            {options.map((candidate: Candidate) => {
              const votersForCandidate = Array.isArray(results[candidate.id]) ? results[candidate.id] : [];
              const votesForCandidate = votersForCandidate.length;
              const percentage = ((votesForCandidate / (totalMembers || 1)) * 100);
              return (
                <div key={candidate.id} className="p-2 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                      <AvatarFallback>
                        {candidate.name.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{candidate.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span>{votesForCandidate} votes</span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {percentage.toFixed(1)}% of total votes
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
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" size="sm" disabled={hasVoted(vote)}>
              <Vote className="mr-2 h-4 w-4" />
              {hasVoted(vote) ? "Already Voted" : "Cast Your Vote"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cast Your Vote</DialogTitle>
              <DialogDescription>Select a candidate to vote for</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate}>
                {options.map((candidate: Candidate) => (
                  <div key={candidate.id} className="flex items-center space-x-2 mb-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={candidate.id} id={candidate.id} />
                    <Label htmlFor={candidate.id} className="flex items-center gap-2 cursor-pointer flex-1">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                        <AvatarFallback>
                          {candidate.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate">{candidate.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowVoteDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={() => handleVote(vote.id)}
                disabled={!selectedCandidate || isSubmitting || hasVoted(vote)}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {hasVoted(vote) ? "Already Voted" : "Submit Vote"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default ActiveVoteCard; 