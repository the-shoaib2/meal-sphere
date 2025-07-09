"use client"

import { useMemo, useCallback, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { formatCurrency } from "@/lib/meal-calculations"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentPeriod } from "@/hooks/use-periods"
import { useRoomCalculations } from "@/hooks/use-calculations"
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"

interface CalculationsProps {
  roomId?: string
}

// Memoized skeleton component
const CalculationsSkeleton = memo(() => {
  const skeletonRows = useMemo(() => [...Array(5)], [])
  const skeletonCards = useMemo(() => [...Array(3)], [])
  
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">
              <Skeleton className="h-6 w-32 mb-1" />
            </CardTitle>
            <CardDescription className="text-sm">
              <Skeleton className="h-4 w-40" />
            </CardDescription>
          </div>
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {skeletonCards.map((_, i) => (
                <div key={i} className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Skeleton className="h-8 w-full mb-2" />
              {skeletonRows.map((_, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

CalculationsSkeleton.displayName = "CalculationsSkeleton"

// Memoized table row component
const UserTableRow = memo(({ user }: { user: any }) => {
  const userInitials = useMemo(() => {
    return user.userName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
  }, [user.userName])

  const balanceClass = useMemo(() => {
    return user.balance >= 0 ? "text-green-600" : "text-red-600"
  }, [user.balance])

  const badgeVariant = useMemo(() => {
    return user.balance >= 0 ? "default" : "destructive"
  }, [user.balance])

  const badgeText = useMemo(() => {
    return user.balance >= 0 ? "Paid" : "Due"
  }, [user.balance])

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.userImage || "/placeholder.svg"} alt={user.userName} />
            <AvatarFallback className="text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">{user.userName}</div>
        </div>
      </TableCell>
      <TableCell className="text-right text-sm">{user.mealCount}</TableCell>
      <TableCell className="text-right text-sm">{formatCurrency(user.cost)}</TableCell>
      <TableCell className="text-right text-sm">{formatCurrency(user.paid)}</TableCell>
      <TableCell className="text-right font-medium text-sm">
        <span className={balanceClass}>
          {formatCurrency(user.balance)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={badgeVariant} className="text-xs">
          {badgeText}
        </Badge>
      </TableCell>
    </TableRow>
  )
})

UserTableRow.displayName = "UserTableRow"

// Memoized header component
const CalculationsHeader = memo(() => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Meal Calculations</h2>
        <p className="text-muted-foreground text-sm">View and manage meal costs and balances</p>
      </div>
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  )
})

CalculationsHeader.displayName = "CalculationsHeader"

// Memoized summary cards component
const SummaryCards = memo(({ summary }: { summary: any }) => {
  return (
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
  )
})

SummaryCards.displayName = "SummaryCards"

const MealCalculations = memo(({ roomId }: CalculationsProps) => {
  const { data: period, isLoading: periodLoading } = useCurrentPeriod()

  // Memoized calculation parameters
  const calcParams = useMemo(() => {
    if (!period) return null
    return {
      roomId,
      startDate: new Date(period.startDate),
      endDate: period.endDate ? new Date(period.endDate) : new Date(),
      dependencies: [roomId, period?.id],
    }
  }, [period, roomId])

  const { data: summary, isLoading } = useRoomCalculations(calcParams || { enabled: false })

  // Memoized period date strings
  const periodDateRange = useMemo(() => {
    if (!period) return ""
    const startDate = new Date(period.startDate).toLocaleDateString()
    const endDate = period.endDate ? new Date(period.endDate).toLocaleDateString() : 'Present'
    return `${period.name} (${startDate} - ${endDate})`
  }, [period])

  // Memoized user summaries
  const userSummaries = useMemo(() => {
    return summary?.userSummaries || []
  }, [summary?.userSummaries])

  // Show loading state if period is loading or calculations are loading
  if (periodLoading || isLoading || !summary) {
    return <CalculationsSkeleton />
  }

  // Show period not found only after loading is complete and no period exists
  if (!period) {
    return (
      <div className="space-y-3">
        <CalculationsHeader />
        <PeriodNotFoundCard />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <CalculationsHeader />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Period Summary</CardTitle>
            <CardDescription className="text-sm">
              {periodDateRange}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SummaryCards summary={summary} />

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
                {userSummaries.map((user: any) => (
                  <UserTableRow key={user.userId} user={user} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

MealCalculations.displayName = "MealCalculations"

export default MealCalculations
