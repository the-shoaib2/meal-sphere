"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Check, Clock, Plus, Vote } from "lucide-react"
import useVoting from "@/hooks/use-voting"
import { useGroups } from "@/hooks/use-groups"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { TimePicker } from "@/components/ui/time-picker"

export default function VotingSystem() {
  const { data: session } = useSession()
  const { activeVotes, pastVotes, loading, createVote, castVote, group } = useVoting()
  const { data: groups = [] } = useGroups()
  const { activeGroup, setActiveGroup } = useActiveGroup()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedVoteType, setSelectedVoteType] = useState("manager")
  const [showVoteDialog, setShowVoteDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState("")
  const [selectedRoom, setSelectedRoom] = useState(activeGroup?.id || "")
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [startTimeStr, setStartTimeStr] = useState("")
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [endTimeStr, setEndTimeStr] = useState("")

  // When group switcher changes, update selectedRoom and activeGroup
  const handleRoomChange = (roomId: string) => {
    setSelectedRoom(roomId)
    const found = groups.find((g) => g.id === roomId)
    if (found) setActiveGroup(found)
  }

  // Add/remove candidate selection
  const handleAddCandidate = () => setSelectedCandidateIds((prev) => [...prev, ""])
  const handleRemoveCandidate = (idx: number) => setSelectedCandidateIds((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
  const handleCandidateChange = (idx: number, value: string) => setSelectedCandidateIds((prev) => prev.map((c, i) => i === idx ? value : c))

  // Get available group members (exclude already selected)
  const availableMembers = (activeGroup?.members || []).filter(
    m => !selectedCandidateIds.includes(m.userId)
  )

  const handleCreateVote = () => {
    const candidates = (activeGroup?.members || [])
      .filter(m => selectedCandidateIds.includes(m.userId))
      .map(m => ({
        id: m.userId,
        name: m.user.name || "Unnamed",
        image: m.user.image || undefined,
        votes: 0
      }))
    if (candidates.length === 0) return
    // Combine date and time into ISO string (not sent to backend for now)
    // const startTime = ...
    // const endTime = ...
    createVote({
      title: selectedVoteType === "manager" ? "Manager Election" : "Meal Preference",
      type: selectedVoteType as any,
      candidates,
      // startTime,
      // endTime,
    })
    setShowCreateDialog(false)
    setSelectedCandidateIds([])
    setStartDate(undefined)
    setStartTimeStr("")
    setEndDate(undefined)
    setEndTimeStr("")
  }

  const handleVote = (voteId: string) => {
    castVote(voteId, selectedCandidate)
    setShowVoteDialog(false)
    setSelectedCandidate("")
  }

  // Keep selectedRoom in sync with activeGroup
  if (activeGroup && selectedRoom !== activeGroup.id) {
    setSelectedRoom(activeGroup.id)
  }

  // Reset candidate selection when dialog opens
  const handleOpenChange = (open: boolean) => {
    setShowCreateDialog(open)
    if (open) {
      setSelectedCandidateIds([])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Voting System</h2>
          <p className="text-muted-foreground">Participate in room votes and elections</p>
          {activeGroup && (
            <div className="mt-1 text-lg font-semibold text-primary">
              Group: {activeGroup.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Vote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Vote</DialogTitle>
                <DialogDescription>Start a new vote in your room</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="vote-type">Vote Type</Label>
                  <Select value={selectedVoteType} onValueChange={setSelectedVoteType}>
                    <SelectTrigger id="vote-type">
                      <SelectValue placeholder="Select vote type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager Election</SelectItem>
                      <SelectItem value="meal">Meal Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Select Candidates</Label>
                  <div className="space-y-2">
                    {selectedCandidateIds.map((userId, idx) => {
                      const selectedMember = (activeGroup?.members || []).find(m => m.userId === userId)
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
                              {(activeGroup?.members || []).map(m => (
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
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
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
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <TimePicker value={endTimeStr} onChange={setEndTimeStr} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVote} disabled={selectedCandidateIds.filter(Boolean).length === 0}>
                  Create Vote
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Vote className="h-6 w-6 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-medium">Loading votes...</h3>
            </CardContent>
          </Card>
        ) : activeVotes.length > 0 ? (
          activeVotes.map((vote) => (
            <Card key={vote.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{vote.title}</CardTitle>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <CardDescription>
                  {/* Starts: {vote.startTime ? new Date(vote.startTime).toLocaleString() : "-"} <br />
                  Ends: {vote.endTime ? new Date(vote.endTime).toLocaleString() : "-"} */}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vote.candidates.map((candidate) => (
                    <div key={candidate.id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                          <AvatarFallback>
                            {candidate.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {candidate.votes} / {vote.totalVotes} votes
                            </p>
                          </div>
                          <Progress value={(candidate.votes / (vote.totalVotes || 1)) * 100} className="h-2 mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Vote className="mr-2 h-4 w-4" />
                      Cast Your Vote
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cast Your Vote</DialogTitle>
                      <DialogDescription>Select a candidate to vote for</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate}>
                        {vote.candidates.map((candidate) => (
                          <div key={candidate.id} className="flex items-center space-x-2 mb-2">
                            <RadioGroupItem value={candidate.id} id={candidate.id} />
                            <Label htmlFor={candidate.id} className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={candidate.image || "/placeholder.svg"} alt={candidate.name} />
                                <AvatarFallback>
                                  {candidate.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              {candidate.name}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleVote(vote.id)} disabled={!selectedCandidate}>
                        Submit Vote
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Vote className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">No Active Votes</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                There are no active votes in this room at the moment.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Vote
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Votes</CardTitle>
          <CardDescription>Results of previous votes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pastVotes.length === 0 ? (
              <p className="text-muted-foreground">No past votes for this group.</p>
            ) : (
              pastVotes.map((vote) => (
                <div key={vote.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 p-2">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{vote.title}</p>
                      <p className="text-sm text-muted-foreground">Ended on {vote.endTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {vote.type === "manager" ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={vote.winner.image || "/placeholder.svg"} alt={vote.winner.name} />
                          <AvatarFallback>
                            {vote.winner.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{vote.winner.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {vote.winner.votes} / {vote.totalVotes} votes
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">{vote.winner.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {vote.winner.votes} / {vote.totalVotes} votes
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
