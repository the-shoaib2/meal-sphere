"use client"

import { useState, useEffect } from "react"
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
import { Check, Clock, Plus, Loader2, RotateCcw } from "lucide-react"
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
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns"
import { TimePicker } from "@/components/ui/time-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { Role } from "@prisma/client"
import CreateVoteDialog from "./voting/create-vote-dialog"
import ActiveVoteCard from "./voting/active-vote-card"
import PastVoteCard from "./voting/past-vote-card"
import NoActiveVotesCard from "./voting/no-active-votes-card"
import PastVotesList from "./voting/past-votes-list"
import LoadingSkeletons from "./voting/loading-skeletons"
import { Candidate, Vote as VoteType, ActiveVote, PastVote, Voter } from "./voting/types"

const VOTE_TYPE_OPTIONS = [
  { value: "manager", label: "Manager Election", backend: "MEAL_MANAGER" },
  { value: "meal", label: "Meal Preference", backend: "MEAL_CHOICE" },
  { value: "accountant", label: "Accountant Election", backend: "ACCOUNTANT" },
  { value: "leader", label: "Room Leader Election", backend: "ROOM_LEADER" },
  { value: "market_manager", label: "Market Manager Election", backend: "MARKET_MANAGER" },
  { value: "group_decision", label: "Group Decision", backend: "GROUP_DECISION" },
  { value: "event_organizer", label: "Event Organizer", backend: "EVENT_ORGANIZER" },
  { value: "cleaning_manager", label: "Cleaning Manager", backend: "CLEANING_MANAGER" },
  { value: "treasurer", label: "Treasurer", backend: "TREASURER" },
  { value: "custom", label: "Custom Vote", backend: "CUSTOM" },
];

export default function VotingSystem() {
  const { data: session } = useSession()
  const { activeVotes, pastVotes, loading, initialLoading, isSubmitting, createVote, castVote, hasVoted, group, refreshVotes } = useVoting()
  const { data: groups = [] } = useGroups()
  const { activeGroup, setActiveGroup } = useActiveGroup()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedVoteType, setSelectedVoteType] = useState("manager")
  const [showVoteDialog, setShowVoteDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState("")
  const [selectedRoom, setSelectedRoom] = useState(activeGroup?.id || "")
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date>(() => startOfDay(new Date()))
  const [startTimeStr, setStartTimeStr] = useState(() => getDefaultStartTimeStr())
  const [endDate, setEndDate] = useState<Date>(() => addDays(startOfDay(new Date()), 1))
  const [endTimeStr, setEndTimeStr] = useState("")
  const [createVoteError, setCreateVoteError] = useState<string | null>(null)

  // Determine if current user is admin in the group
  const currentUserId = session?.user?.id
  const currentMember = activeGroup?.members?.find((m: any) => m.userId === currentUserId)
  const adminRoles = ["ADMIN"];
  const isAdmin = Boolean(currentMember && adminRoles.includes(String(currentMember.role)));

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

  // Only non-admins can be candidates
  const nonAdminMembers = (activeGroup?.members || []).filter(
    m => !adminRoles.includes(String(m.role))
  ).map(m => ({
    ...m,
    user: {
      ...m.user,
      name: m.user.name ?? undefined,
      email: m.user.email ?? undefined,
      image: m.user.image ?? undefined,
    }
  }))
  // Get available group members (exclude already selected)
  const availableMembers = nonAdminMembers.filter(
    m => !selectedCandidateIds.includes(m.userId)
  )

  const handleCreateVote = async () => {
    const candidates = (activeGroup?.members || [])
      .filter(m => selectedCandidateIds.includes(m.userId))
      .map(m => ({
        id: m.userId,
        name: m.user.name || "Unnamed",
        image: m.user.image || undefined
      }))
    if (candidates.length === 0) return
    setCreateVoteError(null)
    try {
      const start = new Date(startDate)
      if (startTimeStr) {
        const [h, m] = startTimeStr.split(":").map(Number)
        start.setHours(h, m, 0, 0)
      }
      const end = new Date(endDate)
      if (endTimeStr) {
        const [h, m] = endTimeStr.split(":").map(Number)
        end.setHours(h, m, 0, 0)
      }
      const result = await createVote({
        title: selectedVoteType === "manager" ? "Manager Election" : "Meal Preference",
        type: selectedVoteType as any,
        candidates,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
      if (result && !result.success) {
        setCreateVoteError(result.error)
        return
      }
      setShowCreateDialog(false)
      setSelectedCandidateIds([])
      setStartDate(startOfDay(new Date()))
      setStartTimeStr(getDefaultStartTimeStr())
      setEndDate(addDays(startOfDay(new Date()), 1))
      setEndTimeStr("")
    } catch (err: any) {
      setCreateVoteError("Failed to create vote. Please try again.")
    }
  }

  const handleVote = async (voteId: string) => {
    await castVote(voteId, selectedCandidate);
    await refreshVotes();
    setShowVoteDialog(false);
    setSelectedCandidate("");
  };

  // Keep selectedRoom in sync with activeGroup
  if (activeGroup && selectedRoom !== activeGroup.id) {
    setSelectedRoom(activeGroup.id)
  }

  // Reset candidate selection when dialog opens
  const handleOpenChange = (open: boolean) => {
    setShowCreateDialog(open)
    if (open) {
      setSelectedCandidateIds([])
      setStartDate(startOfDay(new Date()))
      setStartTimeStr(getDefaultStartTimeStr())
      setEndDate(addDays(startOfDay(new Date()), 1))
      setEndTimeStr("")
      setCreateVoteError(null)
    }
  }

  // Ensure endDate is always at most 2 days after startDate
  useEffect(() => {
    if (isAfter(endDate, addDays(startDate, 2))) {
      setEndDate(addDays(startDate, 2))
    }
    if (isBefore(endDate, startDate)) {
      setEndDate(startDate)
    }
  }, [startDate, endDate])

  function getDefaultStartTimeStr() {
    const now = new Date();
    // Round to next 5 minutes
    const minutes = Math.ceil(now.getMinutes() / 5) * 5;
    now.setMinutes(minutes);
    return now.toTimeString().slice(0, 5);
  }

  // Add a refresh handler
  const handleRefreshVotes = () => {
    refreshVotes();
  };

  // Only show loading skeleton if initialLoading or activeGroup is not loaded
  if (initialLoading || !activeGroup) {
    return <LoadingSkeletons />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">Voting System</h2>
          <div className="mb-2">
            <p className="text-muted-foreground text-base">
              Participate in room votes and elections for
              <span className="ml-1 font-semibold text-primary">{activeGroup.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefreshVotes} title="Refresh votes">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          {isAdmin && (
            <CreateVoteDialog
              open={showCreateDialog}
              onOpenChange={handleOpenChange}
              selectedVoteType={selectedVoteType}
              setSelectedVoteType={setSelectedVoteType}
              selectedCandidateIds={selectedCandidateIds}
              setSelectedCandidateIds={setSelectedCandidateIds}
              nonAdminMembers={nonAdminMembers}
              availableMembers={availableMembers}
              handleAddCandidate={handleAddCandidate}
              handleRemoveCandidate={handleRemoveCandidate}
              handleCandidateChange={handleCandidateChange}
              startDate={startDate}
              setStartDate={setStartDate}
              startTimeStr={startTimeStr}
              setStartTimeStr={setStartTimeStr}
              endDate={endDate}
              setEndDate={setEndDate}
              endTimeStr={endTimeStr}
              setEndTimeStr={setEndTimeStr}
              handleCreateVote={handleCreateVote}
              createVoteError={createVoteError}
              setShowCreateDialog={setShowCreateDialog}
              activeVotesCount={activeVotes.length}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {initialLoading || !activeGroup ? (
          <LoadingSkeletons />
        ) : activeVotes.length > 0 ? (
          activeVotes.map((voteRaw) => {
            const vote = voteRaw as VoteType;
            const totalMembers = activeGroup?.members?.length || 0;
            const options: Candidate[] = Array.isArray((vote as any).options) ? (vote as any).options : [];
            const results: Record<string, Voter[]> = (vote as any).results || {};
            return (
              <ActiveVoteCard
                key={vote.id}
                vote={vote}
                totalMembers={totalMembers}
                options={options}
                results={results}
                showVoteDialog={showVoteDialog}
                setShowVoteDialog={setShowVoteDialog}
                selectedCandidate={selectedCandidate}
                setSelectedCandidate={setSelectedCandidate}
                handleVote={handleVote}
                isSubmitting={isSubmitting}
                hasVoted={hasVoted}
                isAdmin={isAdmin}
                refreshVotes={handleRefreshVotes}
                candidateOptions={nonAdminMembers.map(m => ({ id: m.userId, name: m.user.name || "Unnamed", image: m.user.image }))}
                voteTypeOptions={VOTE_TYPE_OPTIONS}
              />
            );
          })
        ) : pastVotes.length > 0 ? (
          <PastVoteCard
            key={pastVotes[0].id}
            vote={pastVotes[0] as PastVote}
            activeGroupMembersCount={activeGroup?.members?.length || 0}
          />
        ) : (
          <NoActiveVotesCard
            handleRefreshVotes={handleRefreshVotes}
            isAdmin={isAdmin}
            setShowCreateDialog={setShowCreateDialog}
          />
        )}
      </div>
      <PastVotesList
        pastVotes={pastVotes as PastVote[]}
      />

    </div>
  )
}
