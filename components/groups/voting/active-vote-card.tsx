import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Vote, Loader2, Calendar, Users, Timer, Plus, MoreVertical, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 border-primary/10">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Vote className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold truncate">{vote.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isExpiringSoon(vote.endDate) ? "destructive" : "secondary"} className="text-[10px] uppercase font-bold px-2 py-0">
                  {isExpiringSoon(vote.endDate) ? "Expiring Soon" : "Active"}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {timeLeft}
                </span>
              </div>
            </div>
          </div>
          {(isAdmin || vote.userId === currentUserId) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onSelect={() => setEditOpen(true)} className="cursor-pointer">
                  Edit Vote
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive cursor-pointer">
                  Delete Vote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Participation</p>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-bold">{totalVotes} <span className="text-muted-foreground font-normal">/ {totalMembers}</span></p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Timeline</p>
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{formatDate(vote.endDate)}</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {options.map((candidate: Candidate) => {
            const votersForCandidate = Array.isArray(results[candidate.id]) ? results[candidate.id] : [];
            const votesForCandidate = votersForCandidate.length;
            const percentage = ((votesForCandidate / (totalMembers || 1)) * 100);
            const isLeading = totalVotes > 0 && votesForCandidate === Math.max(...options.map(o => (results[o.id] || []).length));

            return (
              <div
                key={candidate.id}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 bg-card/50",
                  isLeading && "border-primary/20 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {candidate.name.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{candidate.name}</p>
                        {isLeading && totalVotes > 0 && (
                          <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 h-4">
                            Leading
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-bold text-primary">{percentage.toFixed(0)}%</p>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn(
                        "h-2",
                        isLeading ? "bg-primary/20 [&>div]:bg-primary" : "bg-muted [&>div]:bg-muted-foreground/30"
                      )}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex -space-x-1.5">
                        <VoterStack
                          voters={votersForCandidate}

                          maxVisible={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="pt-0 border-t bg-muted/10 p-4">
        <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DialogTrigger asChild>
            <Button
              className={cn(
                "w-full font-bold transition-all duration-200 active:scale-95",
                hasVoted(vote) ? "bg-muted text-muted-foreground" : "shadow-lg shadow-primary/20"
              )}
              disabled={hasVoted(vote)}
            >
              {hasVoted(vote) ? (
                <>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 mr-2 h-5">
                    ✓
                  </Badge>
                  Already Voted
                </>
              ) : (
                <>
                  <Vote className="mr-2 h-4 w-4" />
                  Cast Your Vote
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Cast Your Vote</DialogTitle>
              <DialogDescription>
                Select your preferred candidate for <strong>{vote.title}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate} className="grid gap-3">
                {options.map((candidate: Candidate) => (
                  <Label
                    key={candidate.id}
                    htmlFor={candidate.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/50",
                      selectedCandidate === candidate.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                    )}
                  >
                    <RadioGroupItem value={candidate.id} id={candidate.id} className="sr-only" />
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                      <AvatarFallback className="font-bold">
                        {candidate.name.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold flex-1">{candidate.name}</span>
                    {selectedCandidate === candidate.id && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckSquare className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setShowVoteDialog(false)} className="w-full sm:w-auto font-bold rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={() => handleVote(vote.id)}
                disabled={!selectedCandidate || isSubmitting || hasVoted(vote)}
                className="w-full sm:w-auto font-bold rounded-xl shadow-lg shadow-primary/20"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Vote className="mr-2 h-4 w-4" />
                )}
                Confirm Vote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>

      {/* Admin Dialogs moved outside for clean hierarchy */}
      <EditVoteDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vote={vote}
        onSave={handleEditSave}
        loading={editLoading}
        candidateOptions={candidateOptions}
        voteTypeOptions={voteTypeOptions}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Vote?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{vote.title}</strong>? This action cannot be undone and all results will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="ghost" className="font-bold">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading} className="font-bold">
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ActiveVoteCard;
