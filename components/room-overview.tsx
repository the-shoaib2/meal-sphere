"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Users } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export default function RoomOverview() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const isMobile = useIsMobile()

  // Sample data - would come from API
  const rooms = [
    {
      id: "room-1",
      name: "Apartment 303",
      members: 5,
      manager: "John Doe",
      managerAvatar: "/placeholder-user.jpg",
      totalMeals: 145,
      totalCost: 9500,
      mealRate: 65.5,
      isActive: true,
    },
    {
      id: "room-2",
      name: "Hostel Block B",
      members: 7,
      manager: "Jane Smith",
      managerAvatar: "/placeholder-user.jpg",
      totalMeals: 210,
      totalCost: 13650,
      mealRate: 65,
      isActive: true,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Room Management</h2>
          <p className="text-muted-foreground">Manage your meal rooms and members</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Room</DialogTitle>
              <DialogDescription>
                Create a new room for meal management. You'll be the manager by default.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input id="room-name" placeholder="e.g., Apartment 303" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room-description">Description (Optional)</Label>
                <Input id="room-description" placeholder="Brief description of the room" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateDialog(false)}>Create Room</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{room.name}</CardTitle>
                <Badge variant={room.isActive ? "default" : "secondary"}>{room.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <CardDescription>
                {room.members} members • Managed by {room.manager}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar>
                  <AvatarImage src={room.managerAvatar || "/placeholder.svg"} alt={room.manager} />
                  <AvatarFallback>
                    {room.manager
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{room.manager}</p>
                  <p className="text-xs text-muted-foreground">Room Manager</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="flex flex-col items-center justify-center rounded-lg border p-2 sm:p-3">
                  <div className="text-lg sm:text-xl font-bold">{room.totalMeals}</div>
                  <p className="text-xs text-muted-foreground">Total Meals</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-2 sm:p-3">
                  <div className="text-lg sm:text-xl font-bold">৳{room.totalCost}</div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-2 sm:p-3">
                  <div className="text-lg sm:text-xl font-bold">৳{room.mealRate}</div>
                  <p className="text-xs text-muted-foreground">Meal Rate</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Users className="mr-2 h-4 w-4" />
                Members
              </Button>
              <Button size="sm" className="w-full sm:w-auto">
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Invitations</CardTitle>
          <CardDescription>Join existing rooms by accepting invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="text-lg font-medium">No Pending Invitations</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any pending room invitations at the moment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
