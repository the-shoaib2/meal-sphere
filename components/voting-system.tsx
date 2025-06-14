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

export default function VotingSystem() {
  const [selectedRoom, setSelectedRoom] = useState("room-1")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedVoteType, setSelectedVoteType] = useState("manager")
  const [showVoteDialog, setShowVoteDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState("")

  // Sample data - would come from API
  const rooms = [
    { id: "room-1", name: "Apartment 303" },
    { id: "room-2", name: "Hostel Block B" },
  ]

  // Sample active votes - would come from API
  const activeVotes = [
    {
      id: "vote-1",
      title: "Manager Election",
      type: "manager",
      status: "active",
      endTime: "2024-05-25 18:00",
      totalVotes: 4,
      candidates: [
        {
          id: "user-1",
          name: "John Doe",
          image: "/placeholder-user.jpg",
          votes: 2,
        },
        {
          id: "user-2",
          name: "Jane Smith",
          image: "/placeholder-user.jpg",
          votes: 1,
        },
        {
          id: "user-3",
          name: "Bob Johnson",
          image: "/placeholder-user.jpg",
          votes: 1,
        },
      ],
    },
  ]

  // Sample past votes - would come from API
  const pastVotes = [
    {
      id: "vote-2",
      title: "Meal Preference",
      type: "meal",
      status: "completed",
      endTime: "2024-05-15 18:00",
      totalVotes: 5,
      winner: {
        id: "option-1",
        name: "Chicken Biryani",
        votes: 3,
      },
    },
    {
      id: "vote-3",
      title: "Manager Election",
      type: "manager",
      status: "completed",
      endTime: "2024-04-25 18:00",
      totalVotes: 5,
      winner: {
        id: "user-1",
        name: "John Doe",
        image: "/placeholder-user.jpg",
        votes: 4,
      },
    },
  ]

  const handleCreateVote = () => {
    // This would be replaced with an actual API call
    console.log({
      roomId: selectedRoom,
      type: selectedVoteType,
    })

    setShowCreateDialog(false)
  }

  const handleVote = () => {
    // This would be replaced with an actual API call
    console.log({
      voteId: "vote-1",
      candidateId: selectedCandidate,
    })

    setShowVoteDialog(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Voting System</h2>
          <p className="text-muted-foreground">Participate in room votes and elections</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                {selectedVoteType === "meal" && (
                  <div className="grid gap-2">
                    <Label htmlFor="meal-options">Meal Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border p-3 rounded-md">
                        <span>Chicken Biryani</span>
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </div>
                      <div className="flex items-center justify-between border p-3 rounded-md">
                        <span>Beef Curry</span>
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVote}>Create Vote</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {activeVotes.map((vote) => (
          <Card key={vote.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{vote.title}</CardTitle>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Clock className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              </div>
              <CardDescription>Ends on {vote.endTime}</CardDescription>
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
                        <Progress value={(candidate.votes / vote.totalVotes) * 100} className="h-2 mt-1" />
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
                    <Button onClick={handleVote} disabled={!selectedCandidate}>
                      Submit Vote
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}

        {activeVotes.length === 0 && (
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
            {pastVotes.map((vote) => (
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
