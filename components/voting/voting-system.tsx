"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCcw } from "lucide-react"
import useVoting from "@/hooks/use-voting"
import { useGroups } from "@/hooks/use-groups"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns"
import CreateVoteDialog from "./create-vote-dialog"
import ActiveVoteCard from "./active-vote-card"
import PastVoteCard from "./past-vote-card"
import NoActiveVotesCard from "./no-active-votes-card"
import PastVotesList from "./past-votes-list"
import LoadingSkeletons from "./loading-skeletons"
import { Candidate, Vote as VoteType, ActiveVote, PastVote, Voter } from "./types"
import { NoGroupState } from "@/components/empty-states/no-group-state"

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

  // Ensure endDate is always at most 2 days after startDate
  // IMPORTANT: This useEffect must be called before any conditional returns
  useEffect(() => {
    if (isAfter(endDate, addDays(startDate, 2))) {
      setEndDate(addDays(startDate, 2))
    }
    if (isBefore(endDate, startDate)) {
      setEndDate(startDate)
    }
  }, [startDate, endDate])

  // Keep selectedRoom in sync with activeGroup
  useEffect(() => {
    if (activeGroup && selectedRoom !== activeGroup.id) {
      setSelectedRoom(activeGroup.id)
    }
  }, [activeGroup, selectedRoom])

  // Check if user has no groups - show empty state
  if (groups.length === 0 && !initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voting System</h1>
            <p className="text-muted-foreground text-sm">
              Participate in group votes and elections
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  // Get current user info
  const currentUserId = session?.user?.id
  const currentMember = activeGroup?.members?.find((m: any) => m.userId === currentUserId)
  const adminRoles = ["ADMIN"];
  const isAdmin = Boolean(currentMember && adminRoles.includes(String(currentMember.role)));
  const isMember = Boolean(currentMember);

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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">Voting System</h2>
          <div className="mb-1">
            <p className="text-muted-foreground text-sm">
              Participate in room votes and elections for
              <span className="ml-1 font-semibold text-primary">{activeGroup.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshVotes} title="Refresh votes">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          {isMember && (
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

      <div className="grid gap-4 md:grid-cols-2">
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
                currentUserId={currentUserId}
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
            isMember={isMember}
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
