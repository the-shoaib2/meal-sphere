"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

type MealType = 'Breakfast' | 'Lunch' | 'Dinner'
type DayMeals = Record<MealType, boolean>
type MealData = Record<string, DayMeals>

export default function MealTracker() {
  const [date, setDate] = useState<Date>(new Date())
  const [selectedRoom, setSelectedRoom] = useState("room-1")
  const isMobile = useIsMobile()

  // Sample data - would come from API
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - i)
    return day
  }).reverse()

  const mealTypes = ["Breakfast", "Lunch", "Dinner"]

  // Sample meal data - would come from API
  const [mealData, setMealData] = useState<MealData>({
    "2024-05-21": { Breakfast: true, Lunch: true, Dinner: false },
    "2024-05-20": { Breakfast: true, Lunch: true, Dinner: true },
    "2024-05-19": { Breakfast: false, Lunch: true, Dinner: true },
    "2024-05-18": { Breakfast: true, Lunch: false, Dinner: true },
    "2024-05-17": { Breakfast: true, Lunch: true, Dinner: true },
    "2024-05-16": { Breakfast: true, Lunch: true, Dinner: false },
    "2024-05-15": { Breakfast: false, Lunch: true, Dinner: true },
  })

  const handleMealToggle = (date: string, mealType: MealType) => {
    setMealData((prev) => {
      const dateData = prev[date] || { Breakfast: false, Lunch: false, Dinner: false }
      return {
        ...prev,
        [date]: {
          ...dateData,
          [mealType]: !dateData[mealType],
        },
      }
    })
  }

  const formatDateKey = (date: Date) => {
    return format(date, "yyyy-MM-dd")
  }

  const getMealStatus = (date: Date, mealType: MealType): boolean => {
    const dateKey = formatDateKey(date)
    return mealData[dateKey]?.[mealType] || false
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(date)
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setDate(newDate)
  }

  // Mobile view for meal tracking
  const renderMobileMealTracker = () => {
    return (
      <div className="space-y-4">
        {days.map((day) => (
          <Card key={day.toISOString()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{format(day, "EEE, MMM d")}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-3 gap-2">
                {mealTypes.map((mealType) => (
                  <div key={mealType} className="flex items-center justify-between border rounded-md p-2">
                    <span className="text-sm">{mealType}</span>
                    <Checkbox
                      checked={getMealStatus(day, mealType as MealType)}
                      onCheckedChange={() => handleMealToggle(formatDateKey(day), mealType as MealType)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meal Tracker</h2>
          <p className="text-muted-foreground">Track and manage your daily meals</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="room-1">Room 1</SelectItem>
              <SelectItem value="room-2">Room 2</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "MMMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Weekly Meal Plan</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {format(days[0], "MMMM d")} - {format(days[days.length - 1], "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            renderMobileMealTracker()
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Meal Type</TableHead>
                  {days.map((day) => (
                    <TableHead key={day.toISOString()} className="text-center">
                      <div>{format(day, "EEE")}</div>
                      <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mealTypes.map((mealType) => (
                  <TableRow key={mealType}>
                    <TableCell className="font-medium">{mealType}</TableCell>
                    {days.map((day) => (
                      <TableCell key={day.toISOString()} className="text-center">
                        <Checkbox
                          checked={getMealStatus(day, mealType as MealType)}
                          onCheckedChange={() => handleMealToggle(formatDateKey(day), mealType as MealType)}
                          className="mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
          <CardDescription>Your meal statistics for {format(date, "MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-2xl font-bold">32</div>
              <p className="text-xs text-muted-foreground">Total Meals</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-2xl font-bold">৳2,096</div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-2xl font-bold">৳65.50</div>
              <p className="text-xs text-muted-foreground">Per Meal Rate</p>
            </div>
          </div>
          <div className="mt-6 h-[200px] w-full">
            {/* This would be a chart component */}
            <div className="flex items-center justify-center h-full border rounded-md bg-muted/20">
              <p className="text-sm text-muted-foreground">Meal distribution chart will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
