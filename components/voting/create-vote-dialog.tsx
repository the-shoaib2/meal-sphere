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
    <DialogTrigger asChild>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Vote
      </Button>
    </DialogTrigger>
    <DialogContent className="w-full max-w-[95vw] sm:max-w-[420px] overflow-y-auto max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>Create New Vote</DialogTitle>
        <DialogDescription>Start a new vote in your room</DialogDescription>
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
      <div className="grid gap-4 py-4">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-start px-2 py-1"
                      >
                        {selectedMember ? (
                          <>
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={selectedMember.user.image || "/placeholder-user.jpg"} alt={selectedMember.user.name || "User"} />
                              <AvatarFallback>
                                {selectedMember.user.name?.split(" ").map(n => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedMember.user.name || selectedMember.user.email || selectedMember.userId}</span>
                          </>
                        ) : (
                          <span>Select member</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full min-w-[200px]">
                      {availableMembers.concat(selectedMember ? [selectedMember] : []).map(m => (
                        (!selectedCandidateIds.includes(m.userId) || m.userId === userId) && (
                          <DropdownMenuItem
                            key={m.userId}
                            onClick={() => handleCandidateChange(idx, m.userId)}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={m.user.image || "/placeholder-user.jpg"} alt={m.user.name || "User"} />
                              <AvatarFallback>
                                {m.user.name?.split(" ").map(n => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{m.user.name || m.user.email || m.userId}</span>
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedCandidateIds.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveCandidate(idx)}>
                      Remove
                    </Button>
                  )}
                </div>
              )
            })}
            <Button variant="outline" className="w-full" onClick={handleAddCandidate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Start Time</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px] justify-start">
                  {startDate ? format(startDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={d => d && setStartDate(d)}
                  initialFocus
                  disabled={date => isBefore(date, startOfDay(new Date()))}
                />
              </PopoverContent>
            </Popover>
            <TimePicker value={startTimeStr} onChange={setStartTimeStr} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>End Time</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px] justify-start">
                  {endDate ? format(endDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={d => d && setEndDate(d)}
                  initialFocus
                  disabled={date => isBefore(date, startDate) || isAfter(date, addDays(startDate, 2))}
                />
              </PopoverContent>
            </Popover>
            <TimePicker value={endTimeStr} onChange={setEndTimeStr} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button onClick={handleCreateVote} disabled={selectedCandidateIds.filter(Boolean).length === 0} className="w-full sm:w-auto">
          Create Vote
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateVoteDialog; 