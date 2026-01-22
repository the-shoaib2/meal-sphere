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
    <DialogContent className="sm:max-w-[550px] w-full mx-auto rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-xl dark:bg-neutral-900/95">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5 pointer-events-none" />

      <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800 relative z-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
              <Plus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              Create New Vote
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500">
              Launch a new decision process for your group
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar relative z-10">
        {activeVotesCount !== undefined && activeVotesCount > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200 shadow-sm">
            <div className="shrink-0 mt-0.5">
              <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">!</span>
              </div>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              There {activeVotesCount === 1 ? 'is' : 'are'} currently {activeVotesCount} active vote{activeVotesCount !== 1 ? 's' : ''}.
              Please ensure you aren't duplicating an existing vote.
            </p>
          </div>
        )}

        {createVoteError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 shadow-sm animate-in fade-in slide-in-from-top-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {createVoteError}
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="vote-type" className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">
              Vote Type
            </Label>
            <Select value={selectedVoteType} onValueChange={setSelectedVoteType}>
              <SelectTrigger id="vote-type" className="h-12 rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-indigo-500/20 transition-all hover:bg-white hover:shadow-md">
                <SelectValue placeholder="Select vote type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl p-1">
                {VOTE_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/50 cursor-pointer py-3">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Candidates
              </Label>
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                {selectedCandidateIds.length} Added
              </Badge>
            </div>

            <div className="space-y-3 p-1">
              {selectedCandidateIds.map((userId, idx) => {
                return (
                  <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex-1 relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Select value={userId} onValueChange={(value) => handleCandidateChange(idx, value)}>
                        <SelectTrigger className="h-14 pl-3 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all group-hover:border-indigo-300 dark:group-hover:border-indigo-700 group-hover:shadow-sm">
                          <SelectValue placeholder="Select candidate" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[250px] p-1">
                          {availableMembers.length === 0 && !userId ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No more candidates available
                            </div>
                          ) : (
                            availableMembers.concat(
                              // Make sure currently selected user is also in the list even if "filtered out" of available
                              nonAdminMembers.find(m => m.userId === userId) ? [nonAdminMembers.find(m => m.userId === userId)!] : []
                            ).map(member => (
                              // Remove duplicates just in case
                              <SelectItem key={member.userId} value={member.userId} className="rounded-lg my-1 py-2 cursor-pointer focus:bg-gray-50 dark:focus:bg-gray-800">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 border border-gray-100">
                                    <AvatarImage src={member.user.image || "/placeholder.svg"} />
                                    <AvatarFallback className="text-[10px] font-bold bg-indigo-50 text-indigo-600">
                                      {(member.user.name ? member.user.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col text-left">
                                    <span className="text-sm font-semibold leading-none">{member.user.name || "Unnamed"}</span>
                                    <span className="text-[10px] text-muted-foreground">{member.role}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            )).filter((v, i, a) => a.findIndex(t => (t.key === v.key)) === i)
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 transition-all shrink-0"
                      onClick={() => handleRemoveCandidate(idx)}
                      disabled={selectedCandidateIds.length === 1}
                    >
                      <Plus className="h-5 w-5 rotate-45" />
                    </Button>
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-semibold group"
                onClick={handleAddCandidate}
              >
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 flex items-center justify-center mr-2 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                Add Another Candidate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">Start Date & Time</Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start text-left font-normal rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500/20">
                      <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                      className="rounded-2xl p-3"
                    />
                  </PopoverContent>
                </Popover>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 border border-gray-100 dark:border-gray-800">
                  <TimePicker value={startTimeStr} onChange={setStartTimeStr} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">End Date & Time</Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start text-left font-normal rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 focus:ring-2 focus:ring-pink-500/20">
                      <CalendarIcon className="mr-2 h-4 w-4 text-pink-500" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      disabled={(date) => date < startDate}
                      initialFocus
                      className="rounded-2xl p-3"
                    />
                  </PopoverContent>
                </Popover>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 border border-gray-100 dark:border-gray-800">
                  <TimePicker value={endTimeStr} onChange={setEndTimeStr} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="p-6 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-3 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="ghost"
          onClick={() => setShowCreateDialog(false)}
          className="w-full sm:w-auto font-bold rounded-xl h-11 hover:bg-gray-200/50 dark:hover:bg-gray-800"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateVote}
          disabled={selectedCandidateIds.length === 0 || selectedCandidateIds.some(id => !id)}
          className="w-full sm:flex-1 font-bold rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5"
        >
          Create Vote
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateVoteDialog; 