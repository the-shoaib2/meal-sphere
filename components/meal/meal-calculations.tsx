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
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { CalendarIcon, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/meal-calculations"
import { useMeal } from "@/hooks/use-meal"

interface MealCalculationsProps {
  roomId: string
}

export default function MealCalculations({ roomId }: MealCalculationsProps) {
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const { 
    meals, 
    guestMeals, 
    useMealSummary, 
    useMealCount 
  } = useMeal(roomId)

  // Calculate meal summary for the selected period
  useEffect(() => {
    const calculateSummary = () => {
      setIsLoading(true)
      
      try {
        const mealSummaries = useMealSummary(startDate, endDate)
        
        // Calculate totals
        const totalBreakfast = mealSummaries.reduce((sum, day) => sum + day.breakfast, 0)
        const totalLunch = mealSummaries.reduce((sum, day) => sum + day.lunch, 0)
        const totalDinner = mealSummaries.reduce((sum, day) => sum + day.dinner, 0)
        const totalMeals = totalBreakfast + totalLunch + totalDinner
        
        // Calculate meal rate based on actual data
        const mealRate = totalMeals > 0 ? 65.52 : 0 // This would be calculated from actual expenses
        const totalCost = totalMeals * mealRate
        
        // Get unique users from meals and guest meals
        const allMeals = [...meals, ...guestMeals]
        const uniqueUsers = new Map()
        
        allMeals.forEach(meal => {
          if (!uniqueUsers.has(meal.user.id)) {
            uniqueUsers.set(meal.user.id, {
              id: meal.user.id,
              name: meal.user.name,
              image: meal.user.image,
              mealCount: 0,
              cost: 0,
              paid: 0, // This would come from payment system
              balance: 0
            })
          }
        })
        
        // Calculate meal counts for each user
        allMeals.forEach(meal => {
          const user = uniqueUsers.get(meal.user.id)
          if (user) {
            const mealDate = new Date(meal.date)
            if (mealDate >= startDate && mealDate <= endDate) {
              if ('count' in meal) {
                // Guest meal
                user.mealCount += meal.count
              } else {
                // Regular meal
                user.mealCount += 1
              }
            }
          }
        })
        
        // Calculate costs and balances
        const userSummaries = Array.from(uniqueUsers.values()).map(user => {
          const cost = user.mealCount * mealRate
          const paid = Math.floor(cost * 0.8) // Sample data - would come from payment system
          const balance = cost - paid
          
          return {
            ...user,
            cost,
            paid,
            balance
          }
        })
        
        setSummary({
          totalMeals,
          totalCost,
          mealRate,
          startDate,
          endDate,
          userSummaries,
          dailyBreakdown: mealSummaries
        })
      } catch (error) {
        console.error("Error calculating meal summary:", error)
      } finally {
        setIsLoading(false)
      }
    }

    calculateSummary()
  }, [startDate, endDate, meals, guestMeals, useMealSummary])

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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Meal Calculations</h2>
          <p className="text-muted-foreground text-sm">View and manage meal costs and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[120px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "MMM yyyy")}
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
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Monthly Summary</CardTitle>
            <CardDescription className="text-sm">
              {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <div className="text-xl font-bold">{summary.totalMeals}</div>
                  <p className="text-xs text-muted-foreground">Total Meals</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <div className="text-xl font-bold">{formatCurrency(summary.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <div className="text-xl font-bold">{formatCurrency(summary.mealRate)}</div>
                  <p className="text-xs text-muted-foreground">Per Meal Rate</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">Member</TableHead>
                    <TableHead className="text-right text-sm">Meals</TableHead>
                    <TableHead className="text-right text-sm">Cost</TableHead>
                    <TableHead className="text-right text-sm">Paid</TableHead>
                    <TableHead className="text-right text-sm">Balance</TableHead>
                    <TableHead className="text-center text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.userSummaries.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {user.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm">{user.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{user.mealCount}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(user.cost)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(user.paid)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        <span className={user.balance >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(user.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={user.balance >= 0 ? "default" : "destructive"} className="text-xs">
                          {user.balance >= 0 ? "Paid" : "Due"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground text-sm">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
