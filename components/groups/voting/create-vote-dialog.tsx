import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
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
    <DialogContent className="sm:max-w-[450px] w-[calc(100%-2rem)] mx-auto sm:w-full rounded-lg sm:rounded-lg">
      <DialogHeader className="space-y-1">
        <DialogTitle className="text-lg sm:text-xl">
          Create New Vote
        </DialogTitle>
        <DialogDescription className="text-sm">
          Set up a new vote for your room members.
        </DialogDescription>
      </DialogHeader>
      {activeVotesCount && activeVotesCount > 0 && (
        <div className="text-amber-600 text-sm mb-2 p-2 bg-amber-50 border border-amber-200 rounded">
          ⚠️ There {activeVotesCount === 1 ? 'is' : 'are'} currently {activeVotesCount} active vote{activeVotesCount !== 1 ? 's' : ''} in this group. 
          You can only create one vote of each type at a time.
        </div>
      )}
      {createVoteError && (
        <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 border border-red-200 rounded">
          {createVoteError}
        </div>
      )}
      <div className="grid gap-3 py-2">
        <div className="grid gap-2">
          <Label htmlFor="vote-type">Vote Type</Label>
          <Select value={selectedVoteType} onValueChange={setSelectedVoteType}>
            <SelectTrigger id="vote-type" className="w-full">
              <SelectValue placeholder="Select vote type" />
            </SelectTrigger>
            <SelectContent>
              {VOTE_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Select Candidates</Label>
          <div className="space-y-2">
            {selectedCandidateIds.map((userId, idx) => {
              const selectedMember = nonAdminMembers.find(m => m.userId === userId)
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={userId} onValueChange={(value) => handleCandidateChange(idx, value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map(member => (
                        <SelectItem key={member.userId} value={member.userId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.user.image || "/placeholder.svg"} alt={member.user.name || "User"} />
                              <AvatarFallback>
                                {(member.user.name ? member.user.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.user.name || "Unnamed"}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveCandidate(idx)}
                    disabled={selectedCandidateIds.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCandidate}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Start Date & Time</Label>
          <div className="grid grid-cols-2 gap-2">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && setStartDate(date)}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
            <TimePicker
              value={startTimeStr}
              onChange={setStartTimeStr}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>End Date & Time</Label>
          <div className="grid grid-cols-2 gap-2">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && setEndDate(date)}
              disabled={(date) => date < startDate}
              className="rounded-md border"
            />
            <TimePicker
              value={endTimeStr}
              onChange={setEndTimeStr}
            />
          </div>
        </div>
      </div>
      <DialogFooter className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleCreateVote}
          disabled={selectedCandidateIds.length === 0 || selectedCandidateIds.some(id => !id)}
          className="w-full sm:w-auto"
          size="sm"
        >
          Create Vote
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateVoteDialog; 