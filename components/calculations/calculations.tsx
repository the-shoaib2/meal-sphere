"use client"

import { useMemo, useCallback, memo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurrentPeriod, usePeriods, usePeriod } from "@/hooks/use-periods"
import { useRoomCalculations } from "@/hooks/use-calculations"
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"
import { useSession } from "next-auth/react"
import { useActiveGroup } from "@/contexts/group-context"

// Import separated components
import CalculationsSkeleton from "@/components/calculations/calculations-skeleton"
import UserTableRow from "@/components/calculations/user-table-row"
import CalculationsHeader from "@/components/calculations/calculations-header"
import SummaryCards from "@/components/calculations/summary-cards"

interface CalculationsProps {
  roomId?: string
}

const MealCalculations = memo(({ roomId }: CalculationsProps) => {
  const { data: session } = useSession()
  const { activeGroup } = useActiveGroup()
  const { data: currentPeriod, isLoading: periodLoading } = useCurrentPeriod()
  const { data: allPeriods = [] } = usePeriods(true) // Include archived periods for admin navigation
  
  // State for period navigation
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  
  // Get current user's role
  const member = activeGroup?.members?.find(m => m.userId === session?.user?.id)
  const userRole = member?.role
  const isAdmin = userRole === 'ADMIN'
  
  // Get selected period data
  const { data: selectedPeriod } = usePeriod(selectedPeriodId || '')
  
  // Determine which period to use for calculations
  const periodToUse = selectedPeriodId ? selectedPeriod : currentPeriod
  
  // Find current period index in all periods
  const currentPeriodIndex = useMemo(() => {
    if (!currentPeriod || !allPeriods.length) return -1
    return allPeriods.findIndex((p: any) => p.id === currentPeriod.id)
  }, [currentPeriod, allPeriods])
  
  // Find selected period index
  const selectedPeriodIndex = useMemo(() => {
    if (!selectedPeriodId || !allPeriods.length) return currentPeriodIndex
    return allPeriods.findIndex((p: any) => p.id === selectedPeriodId)
  }, [selectedPeriodId, allPeriods, currentPeriodIndex])
  
  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (selectedPeriodIndex > 0) {
      setSelectedPeriodId(allPeriods[selectedPeriodIndex - 1].id)
    }
  }, [selectedPeriodIndex, allPeriods])
  
  const handleNext = useCallback(() => {
    if (selectedPeriodIndex < allPeriods.length - 1) {
      setSelectedPeriodId(allPeriods[selectedPeriodIndex + 1].id)
    }
  }, [selectedPeriodIndex, allPeriods])
  
  // Check if navigation is available
  const hasPrevious = selectedPeriodIndex > 0
  const hasNext = selectedPeriodIndex < allPeriods.length - 1

  // Memoized calculation parameters
  const calcParams = useMemo(() => {
    if (!periodToUse) return null
    return {
      roomId,
      startDate: new Date(periodToUse.startDate),
      endDate: periodToUse.endDate ? new Date(periodToUse.endDate) : new Date(),
      dependencies: [roomId, periodToUse?.id],
    }
  }, [periodToUse, roomId])

  const { data: summary, isLoading } = useRoomCalculations(calcParams || { enabled: false })

  // Memoized period date strings
  const periodDateRange = useMemo(() => {
    if (!periodToUse) return ""
    const startDate = new Date(periodToUse.startDate).toLocaleDateString()
    const endDate = periodToUse.endDate ? new Date(periodToUse.endDate).toLocaleDateString() : 'Present'
    return `${periodToUse.name} (${startDate} - ${endDate})`
  }, [periodToUse])

  // Memoized user summaries
  const userSummaries = useMemo(() => {
    return summary?.userSummaries || []
  }, [summary?.userSummaries])

  // Show loading state if period is loading or calculations are loading
  if (periodLoading || isLoading || !summary) {
    return <CalculationsSkeleton />
  }

  // Show period not found only after loading is complete and no period exists
  if (!periodToUse) {
    return (
      <div className="space-y-3">
        <CalculationsHeader 
          isAdmin={isAdmin}
          currentPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
        <PeriodNotFoundCard />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <CalculationsHeader 
        isAdmin={isAdmin}
        currentPeriod={currentPeriod}
        selectedPeriodId={selectedPeriodId}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />

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
