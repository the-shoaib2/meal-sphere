import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { DropdownMenu as CandidateDropdownMenu, DropdownMenuTrigger as CandidateDropdownMenuTrigger, DropdownMenuContent as CandidateDropdownMenuContent, DropdownMenuItem as CandidateDropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Candidate, ActiveVote } from "./types";

interface EditVoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vote: ActiveVote;
  onSave: (data: { type: string; candidates: Candidate[] }) => Promise<void>;
  loading: boolean;
  candidateOptions: Candidate[];
  voteTypeOptions: { value: string; label: string; backend: string }[];
}

// Helper to map backend type to select value
function backendTypeToSelect(type: string, voteTypeOptions: { value: string; label: string; backend: string }[]) {
  const found = voteTypeOptions.find(opt => opt.backend === type);
  return found ? found.value : type;
}

// Helper to map select value to backend type
function selectToBackendType(type: string, voteTypeOptions: { value: string; label: string; backend: string }[]) {
  const found = voteTypeOptions.find(opt => opt.value === type);
  return found ? found.backend : type;
}

const EditVoteDialog: React.FC<EditVoteDialogProps> = ({
  open,
  onOpenChange,
  vote,
  onSave,
  loading,
  candidateOptions,
  voteTypeOptions,
}) => {
  const [editType, setEditType] = useState(backendTypeToSelect(vote.type, voteTypeOptions) || "manager");
  const [editCandidateIds, setEditCandidateIds] = useState<string[]>(vote.options.map(c => c.id));

  useEffect(() => {
    if (open) {
      console.log('vote.type:', vote.type, 'mapped:', backendTypeToSelect(vote.type, voteTypeOptions));
      setEditType(backendTypeToSelect(vote.type, voteTypeOptions) || "manager");
      setEditCandidateIds(vote.options.map(c => c.id));
    }
    console.log('editType:', editType);
  }, [open, vote, voteTypeOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare candidates array
    const candidates = editCandidateIds
      .map(id => candidateOptions.find(c => c.id === id))
      .filter(Boolean) as Candidate[];
    await onSave({ type: selectToBackendType(editType, voteTypeOptions), candidates });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] w-full">
        <DialogHeader>
          <DialogTitle>Edit Vote</DialogTitle>
          <DialogDescription>Update the vote type and candidates.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="vote-type">Vote Type</Label>
            <Select value={editType} onValueChange={setEditType}>
              <SelectTrigger id="vote-type" className="w-full">
                <SelectValue placeholder="Select vote type" />
              </SelectTrigger>
              <SelectContent>
                {voteTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Select Candidates</Label>
            <div className="space-y-2">
              {editCandidateIds.map((userId, idx) => {
                const selectedMember = candidateOptions.find(c => c.id === userId);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <CandidateDropdownMenu>
                      <CandidateDropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full flex items-center justify-start px-2 py-1"
                        >
                          {selectedMember ? (
                            <>
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={selectedMember.image || "/placeholder-user.jpg"} alt={selectedMember.name || "User"} />
                                <AvatarFallback>
                                  {selectedMember.name?.split(" ").map(n => n[0]).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{selectedMember.name}</span>
                            </>
                          ) : (
                            <span>Select member</span>
                          )}
                        </Button>
                      </CandidateDropdownMenuTrigger>
                      <CandidateDropdownMenuContent align="start" className="w-full min-w-[200px]">
                        {candidateOptions.map(m => (
                          (!editCandidateIds.includes(m.id) || m.id === userId) ? (
                            <CandidateDropdownMenuItem
                              key={m.id}
                              onClick={() => setEditCandidateIds(ids => ids.map((id, i) => i === idx ? m.id : id))}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={m.image || "/placeholder-user.jpg"} alt={m.name || "User"} />
                                <AvatarFallback>
                                  {m.name?.split(" ").map(n => n[0]).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{m.name}</span>
                            </CandidateDropdownMenuItem>
                          ) : null
                        )).filter(Boolean)}
                      </CandidateDropdownMenuContent>
                    </CandidateDropdownMenu>
                    {editCandidateIds.length > 1 && (
                      <Button variant="ghost" onClick={() => setEditCandidateIds(ids => ids.filter((_, i) => i !== idx))}>
                        Remove
                      </Button>
                    )}
                  </div>
                );
              }).filter(Boolean)}
              <Button variant="outline" className="w-full" onClick={e => { e.preventDefault(); setEditCandidateIds(ids => [...ids, ""]); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Candidate
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVoteDialog; 