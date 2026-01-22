import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Plus, Calendar as CalendarIcon, Trash2, AlertCircle, Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { format, startOfDay } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

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
  customVoteType: string;
  setCustomVoteType: (type: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  candidateType: "member" | "custom";
  setCandidateType: (type: "member" | "custom") => void;
  customCandidates: string[];
  setCustomCandidates: (candidates: string[]) => void;
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
  voteTypeOptions: { label: string; options: { value: string; label: string; }[] }[];
}

const CreateVoteDialog: React.FC<CreateVoteDialogProps> = ({
  open,
  onOpenChange,
  selectedVoteType,
  setSelectedVoteType,
  customVoteType,
  setCustomVoteType,
  description,
  setDescription,
  candidateType,
  setCandidateType,
  customCandidates,
  setCustomCandidates,
  selectedCandidateIds,
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
  voteTypeOptions,
}) => {
  const [newCustomCandidate, setNewCustomCandidate] = React.useState("");

  const handleAddCustomCandidate = () => {
    if (newCustomCandidate.trim()) {
      setCustomCandidates([...customCandidates, newCustomCandidate.trim()]);
      setNewCustomCandidate("");
    }
  };

  const handleRemoveCustomCandidate = (index: number) => {
    setCustomCandidates(customCandidates.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Vote</DialogTitle>
          <DialogDescription>
            Launch a new decision process for your group.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {activeVotesCount !== undefined && activeVotesCount > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Active Votes</AlertTitle>
              <AlertDescription>
                There {activeVotesCount === 1 ? 'is' : 'are'} currently {activeVotesCount} active vote{activeVotesCount !== 1 ? 's' : ''}.
                Please ensure you aren't duplicating an existing vote.
              </AlertDescription>
            </Alert>
          )}

          {createVoteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{createVoteError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label htmlFor="vote-type">
              Vote Type <span className="text-destructive ms-1">*</span>
            </Label>
            <Select value={selectedVoteType} onValueChange={setSelectedVoteType}>
              <SelectTrigger id="vote-type">
                <SelectValue placeholder="Select vote type" />
              </SelectTrigger>
              <SelectContent>
                {voteTypeOptions.map((group, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <SelectSeparator />}
                    <SelectGroup>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>

            {selectedVoteType === "custom" && (
              <div className="pt-2 animate-in slide-in-from-top-2">
                <Label htmlFor="custom-type" className="sr-only">
                  Custom Type Name <span className="text-destructive ms-1">*</span>
                </Label>
                <Input
                  id="custom-type"
                  placeholder="Enter vote type name..."
                  value={customVoteType}
                  onChange={(e) => setCustomVoteType(e.target.value)}
                  maxLength={30}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details about this vote..."
              className="resize-none h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>
                Candidates / Options <span className="text-destructive ms-1">*</span>
              </Label>
              <Badge variant="secondary">
                {candidateType === "member" ? selectedCandidateIds.length : customCandidates.length} Added
              </Badge>
            </div>

            <Tabs value={candidateType} onValueChange={(v) => setCandidateType(v as "member" | "custom")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="member">Select Members</TabsTrigger>
                <TabsTrigger value="custom">Custom Options</TabsTrigger>
              </TabsList>

              <TabsContent value="member" className="space-y-2 mt-0">
                {selectedCandidateIds.map((userId, idx) => {
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select value={userId} onValueChange={(value) => handleCandidateChange(idx, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select candidate" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMembers.length === 0 && !userId ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                No more candidates available
                              </div>
                            ) : (
                              availableMembers.concat(
                                // Make sure currently selected user is also in the list even if "filtered out" of available
                                nonAdminMembers.find(m => m.userId === userId) ? [nonAdminMembers.find(m => m.userId === userId)!] : []
                              ).map(member => (
                                // Remove duplicates just in case
                                <SelectItem key={member.userId} value={member.userId}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={member.user.image || "/placeholder.svg"} />
                                      <AvatarFallback>
                                        {(member.user.name ? member.user.name.split(" ").map((n: string) => n[0]).join("") : "?")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start gap-0.5">
                                      <span className="text-sm font-medium leading-none">{member.user.name || "Unnamed"}</span>
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground font-normal">
                                        {member.role}
                                      </Badge>
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
                        onClick={() => handleRemoveCandidate(idx)}
                        disabled={selectedCandidateIds.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={handleAddCandidate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Candidate
                </Button>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 mt-0">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter option name (e.g., Pizza, Park)"
                    value={newCustomCandidate}
                    onChange={(e) => setNewCustomCandidate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomCandidate();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddCustomCandidate} disabled={!newCustomCandidate.trim()}>
                    Add
                  </Button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {customCandidates.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-md">
                      No options added yet.
                    </div>
                  )}
                  {customCandidates.map((option, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-secondary/20 rounded-md border border-secondary/20">
                      <span className="text-sm font-medium pl-2">{option}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveCustomCandidate(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label>
                Start Date & Time <span className="text-destructive ms-1">*</span>
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
                <div className="w-[120px]">
                  <TimePicker value={startTimeStr} onChange={setStartTimeStr} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                End Date & Time <span className="text-destructive ms-1">*</span>
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      disabled={(date) => date < startDate}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
                <div className="w-[120px]">
                  <TimePicker value={endTimeStr} onChange={setEndTimeStr} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowCreateDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateVote}
            disabled={
              candidateType === "member"
                ? (selectedCandidateIds.length === 0 || selectedCandidateIds.some(id => !id))
                : customCandidates.length < 2 || (selectedVoteType === "custom" && customVoteType.trim().length < 3)
            }
          >
            Create Vote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateVoteDialog;
