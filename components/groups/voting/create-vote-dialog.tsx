import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { format, addDays, isBefore, startOfDay, isAfter } from "date-fns";
import { Candidate } from "./types";

interface Member {
  userId: string;
  user: { name?: string; email?: string; image?: string };
  role: string;
}

interface CreateVoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoteType: string;
  setSelectedVoteType: (type: string) => void;
  selectedCandidateIds: string[];
  setSelectedCandidateIds: (ids: string[]) => void;
  nonAdminMembers: Member[];
  availableMembers: Member[];
  handleAddCandidate: () => void;
  handleRemoveCandidate: (idx: number) => void;
  handleCandidateChange: (idx: number, value: string) => void;
  startDate: Date;
  setStartDate: (date: Date) => void;
  startTimeStr: string;
  setStartTimeStr: (str: string) => void;
  endDate: Date;
  setEndDate: (date: Date) => void;
  endTimeStr: string;
  setEndTimeStr: (str: string) => void;
  handleCreateVote: () => void;
  createVoteError: string | null;
  setShowCreateDialog: (open: boolean) => void;
  activeVotesCount?: number;
}

const VOTE_TYPE_OPTIONS = [
  { value: "manager", label: "Manager Election" },
  { value: "meal", label: "Meal Preference" },
  { value: "accountant", label: "Accountant Election" },
  { value: "leader", label: "Room Leader Election" },
  { value: "market_manager", label: "Market Manager Election" },
  { value: "group_decision", label: "Group Decision" },
  { value: "event_organizer", label: "Event Organizer" },
  { value: "cleaning_manager", label: "Cleaning Manager" },
  { value: "treasurer", label: "Treasurer" },
  { value: "custom", label: "Custom Vote" },
];

const CreateVoteDialog: React.FC<CreateVoteDialogProps> = ({
  open,
  onOpenChange,
  selectedVoteType,
  setSelectedVoteType,
  selectedCandidateIds,
  setSelectedCandidateIds,
  nonAdminMembers,
  availableMembers,
  handleAddCandidate,
  handleRemoveCandidate,
  handleCandidateChange,
  startDate,
  setStartDate,
  startTimeStr,
  setStartTimeStr,
  endDate,
  setEndDate,
  endTimeStr,
  setEndTimeStr,
  handleCreateVote,
  createVoteError,
  setShowCreateDialog,
  activeVotesCount,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[500px] w-[calc(100%-1rem)] mx-auto rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
      <DialogHeader className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold">Create New Vote</DialogTitle>
            <DialogDescription className="text-sm">
              Set up a new vote for your group members.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="p-6 pt-2 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {activeVotesCount && activeVotesCount > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
            <Badge variant="outline" className="mt-0.5 bg-amber-500 text-white border-none h-5 w-5 p-0 flex items-center justify-center rounded-full">!</Badge>
            <p className="text-xs font-medium">
              There {activeVotesCount === 1 ? 'is' : 'are'} currently {activeVotesCount} active vote{activeVotesCount !== 1 ? 's' : ''}.
              Each type must be unique.
            </p>
          </div>
        )}

        {createVoteError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600">
            <p className="text-sm font-semibold">{createVoteError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vote-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Vote Purpose
            </Label>
            <Select value={selectedVoteType} onValueChange={setSelectedVoteType}>
              <SelectTrigger id="vote-type" className="h-11 rounded-xl border-muted bg-muted/20 focus:ring-primary/20">
                <SelectValue placeholder="Select vote type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {VOTE_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Candidates
              </Label>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
                {selectedCandidateIds.length} Selected
              </span>
            </div>

            <div className="space-y-2.5">
              {selectedCandidateIds.map((userId, idx) => {
                const selectedMember = nonAdminMembers.find(m => m.userId === userId)
                return (
                  <div key={idx} className="flex items-center gap-2 group">
                    <Select value={userId} onValueChange={(value) => handleCandidateChange(idx, value)}>
                      <SelectTrigger className="h-11 rounded-xl border-muted bg-muted/20 flex-1 transition-all group-hover:border-primary/30">
                        <SelectValue placeholder="Select a candidate" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableMembers.map(member => (
                          <SelectItem key={member.userId} value={member.userId} className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.user.image || "/placeholder.svg"} />
                                <AvatarFallback className="text-[10px] font-bold">
                                  {(member.user.name ? member.user.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{member.user.name || "Unnamed"}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleRemoveCandidate(idx)}
                      disabled={selectedCandidateIds.length === 1}
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl border-dashed border-2 border-muted hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all font-bold"
                onClick={handleAddCandidate}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Candidate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Schedule</Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-start text-left font-normal rounded-xl border-muted bg-muted/20">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                      className="rounded-2xl"
                    />
                  </PopoverContent>
                </Popover>
                <TimePicker value={startTimeStr} onChange={setStartTimeStr} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Schedule</Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-start text-left font-normal rounded-xl border-muted bg-muted/20">
                      <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      disabled={(date) => date < startDate}
                      initialFocus
                      className="rounded-2xl"
                    />
                  </PopoverContent>
                </Popover>
                <TimePicker value={endTimeStr} onChange={setEndTimeStr} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="p-6 bg-muted/20 flex flex-col sm:flex-row gap-3">
        <Button
          variant="ghost"
          onClick={() => setShowCreateDialog(false)}
          className="w-full sm:w-auto font-bold rounded-xl h-11"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateVote}
          disabled={selectedCandidateIds.length === 0 || selectedCandidateIds.some(id => !id)}
          className="w-full sm:flex-1 font-bold rounded-xl h-11 shadow-lg shadow-primary/20"
        >
          Create Vote Project
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateVoteDialog; 