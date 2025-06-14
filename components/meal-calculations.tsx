"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subMonths, addMonths } from "date-fns"
import { CalendarIcon, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/meal-calculations"
import type { RoomMealSummary } from "@/lib/meal-calculations"

export default function MealCalculations() {
  const [selectedRoom, setSelectedRoom] = useState("room-1")
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<RoomMealSummary | null>(null)

  // Sample data - would be replaced with API call
  const rooms = [
    { id: "room-1", name: "Apartment 303" },
    { id: "room-2", name: "Hostel Block B" },
  ]

  // Sample data - would be replaced with API response
  const sampleSummary: RoomMealSummary = {
    totalMeals: 145,
    totalCost: 9500,
    mealRate: 65.52,
    startDate: new Date(2024, 4, 1),
    endDate: new Date(2024, 4, 31),
    userSummaries: [
      {
        userId: "user-1",
        userName: "John Doe",
        userImage: "/placeholder-user.jpg",
        mealCount: 45,
        cost: 2948.4,
        paid: 3000,
        balance: 51.6,
      },
      {
        userId: "user-2",
        userName: "Jane Smith",
        userImage: "/placeholder-user.jpg",
        mealCount: 38,
        cost: 2489.76,
        paid: 2500,
        balance: 10.24,
      },
      {
        userId: "user-3",
        userName: "Bob Johnson",
        userImage: "/placeholder-user.jpg",
        mealCount: 42,
        cost: 2751.84,
        paid: 2000,
        balance: -751.84,
      },
      {
        userId: "user-4",
        userName: "Alice Brown",
        userImage: "/placeholder-user.jpg",
        mealCount: 20,
        cost: 1310.4,
        paid: 2000,
        balance: 689.6,
      },
    ],
  }

  useEffect(() => {
    // This would be replaced with an actual API call
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setSummary(sampleSummary)
      } catch (error) {
        console.error("Error fetching meal calculations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedRoom, startDate, endDate])

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      const prevMonth = subMonths(startDate, 1)
      setStartDate(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1))
      setEndDate(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0))
    } else {
      const nextMonth = addMonths(startDate, 1)
      setStartDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
      setEndDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meal Calculations</h2>
          <p className="text-muted-foreground">View and manage meal costs and balances</p>
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (date) {
                      setStartDate(new Date(date.getFullYear(), date.getMonth(), 1))
                      setEndDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>
              {format(startDate, "MMMM d, yyyy")} - {format(endDate, "MMMM d, yyyy")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                  <div className="text-2xl font-bold">{summary.totalMeals}</div>
                  <p className="text-xs text-muted-foreground">Total Meals</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                  <div className="text-2xl font-bold">{formatCurrency(summary.mealRate)}</div>
                  <p className="text-xs text-muted-foreground">Per Meal Rate</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Meals</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.userSummaries.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.userImage || "/placeholder.svg"} alt={user.userName} />
                            <AvatarFallback>
                              {user.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>{user.userName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{user.mealCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(user.cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(user.paid)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={user.balance >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(user.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={user.balance >= 0 ? "success" : "destructive"}>
                          {user.balance >= 0 ? "Paid" : "Due"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
