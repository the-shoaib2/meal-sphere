"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation" // Added useRouter
import { useVoting } from "@/hooks/use-voting"
import { useGroups } from "@/hooks/use-groups"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns"
import CreateVoteDialog from "./create-vote-dialog"
import ActiveVoteCard from "./active-vote-card"
import PastVoteCard from "./past-vote-card"
import NoActiveVotesCard from "./no-active-votes-card"
import PastVotesList from "./past-votes-list"
import { LoadingWrapper, Loader } from "@/components/ui/loader"
import { Candidate, Vote as VoteType, ActiveVote, PastVote, Voter } from "./types"
import { NoGroupState } from "@/components/empty-states/no-group-state"
import { PageHeader } from "@/components/shared/page-header"

const VOTE_TYPE_OPTIONS = [
  {
    label: "Elections",
    options: [
      { value: "manager", label: "Manager Election", backend: "MEAL_MANAGER" },
      { value: "leader", label: "Room Leader Election", backend: "ROOM_LEADER" },
      { value: "accountant", label: "Accountant Election", backend: "ACCOUNTANT" },
      { value: "treasurer", label: "Treasurer", backend: "TREASURER" },
      { value: "market_manager", label: "Market Manager Election", backend: "MARKET_MANAGER" },
      { value: "cleaning_manager", label: "Cleaning Manager", backend: "CLEANING_MANAGER" },
    ]
  },
  {
    label: "Decisions",
    options: [
      { value: "meal", label: "Meal Preference", backend: "MEAL_CHOICE" },
      { value: "group_decision", label: "Group Decision", backend: "GROUP_DECISION" },
      { value: "event_organizer", label: "Event Organizer", backend: "EVENT_ORGANIZER" },
    ]
  },
  {
    label: "Other",
    options: [
      { value: "custom", label: "Custom Vote", backend: "CUSTOM" },
    ]
  }
];

const FLAT_VOTE_TYPE_OPTIONS = VOTE_TYPE_OPTIONS.flatMap(g => g.options);

interface VotingSystemProps {
  activeGroup?: any;
  initialVotes?: any[];
  currentUser?: any;
}

export default function VotingSystem({ activeGroup: propGroup, initialVotes, currentUser: propUser }: VotingSystemProps) {
  const { data: session } = useSession()
  const user = propUser || session?.user
  const { activeGroup: contextGroup, setActiveGroup } = useActiveGroup()
  const activeGroup = propGroup || contextGroup

  const {
    activeVotes,
    pastVotes,
    loading,
    initialLoading,
    isSubmitting,
    createVote,
    castVote,
    hasVoted,
    refreshVotes
  } = useVoting({
    groupId: activeGroup?.id,
    initialVotes: initialVotes,
    userId: user?.id
  })

  const { data: groups = [] } = useGroups()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedVoteType, setSelectedVoteType] = useState("manager")
  const [customVoteType, setCustomVoteType] = useState("")
  const [description, setDescription] = useState("")
  const [candidateType, setCandidateType] = useState<"member" | "custom">("member")
  const [customCandidates, setCustomCandidates] = useState<string[]>([]) // List of custom candidate names
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

  // Auto-fill description based on vote type
  useEffect(() => {
    if (selectedVoteType === "custom") {
      setDescription("")
      return
    }

    const option = FLAT_VOTE_TYPE_OPTIONS.find(o => o.value === selectedVoteType)
    if (option) {
      setDescription(`Vote to decide on ${option.label}`)
    }
  }, [selectedVoteType])

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
        <NoGroupState />
      </div>
    );
  }

  // Get current user info
  const currentUserId = user?.id
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

  // All members can be candidates
  const eligibleMembers = (activeGroup?.members || []).map((m: any) => ({
    ...m,
    user: {
      ...m.user,
      name: m.user.name ?? undefined,
      email: m.user.email ?? undefined,
      image: m.user.image ?? undefined,
    }
  }))
  // Get available group members (exclude already selected)
  const availableMembers = eligibleMembers.filter(
    (m: any) => !selectedCandidateIds.includes(m.userId)
  )

  const handleCreateVote = async () => {
    let candidates: Candidate[] = [];

    if (candidateType === "member") {
      candidates = (activeGroup?.members || [])
        .filter((m: any) => selectedCandidateIds.includes(m.userId))
        .map((m: any) => ({
          id: m.userId,
          name: m.user.name || "Unnamed",
          image: m.user.image || undefined
        }));
    } else {
      // Create custom candidates with generated IDs
      candidates = customCandidates.map(name => ({
        id: crypto.randomUUID(),
        name: name
      }));
    }

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
      const title = selectedVoteType === "custom"
        ? customVoteType
        : FLAT_VOTE_TYPE_OPTIONS.find(o => o.value === selectedVoteType)?.label || "Vote";

      const result = await createVote({
        title,
        description,
        type: selectedVoteType === "custom" ? "custom" : selectedVoteType,
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
      setEndTimeStr("")
      setCreateVoteError(null)
      setCustomVoteType("")
      setCustomCandidates([])
      setCandidateType("member")

      const option = FLAT_VOTE_TYPE_OPTIONS.find(o => o.value === selectedVoteType)
      setDescription(option && selectedVoteType !== "custom" ? `Vote to decide on ${option.label}` : "")
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



  return (
    <LoadingWrapper isLoading={initialLoading || !activeGroup}>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            {isMember && (
              <CreateVoteDialog
                open={showCreateDialog}
                onOpenChange={handleOpenChange}
                selectedVoteType={selectedVoteType}
                setSelectedVoteType={setSelectedVoteType}
                customVoteType={customVoteType}
                setCustomVoteType={setCustomVoteType}
                description={description}
                setDescription={setDescription}
                candidateType={candidateType}
                setCandidateType={setCandidateType}
                customCandidates={customCandidates}
                setCustomCandidates={setCustomCandidates}
                selectedCandidateIds={selectedCandidateIds}
                setSelectedCandidateIds={setSelectedCandidateIds}
                nonAdminMembers={eligibleMembers}
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
                voteTypeOptions={VOTE_TYPE_OPTIONS}
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {activeVotes.length > 0 ? (
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
                  candidateOptions={eligibleMembers.map((m: any) => ({ id: m.userId, name: m.user.name || "Unnamed", image: m.user.image }))}
                  voteTypeOptions={FLAT_VOTE_TYPE_OPTIONS}
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
    </LoadingWrapper>
  )
}
