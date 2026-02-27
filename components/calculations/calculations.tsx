"use client"

import { useMemo, useCallback, memo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurrentPeriod, usePeriods, usePeriod } from "@/hooks/use-periods"
import { useRoomCalculations, type CalculationsPageData } from "@/hooks/use-calculations"
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"
import { useSession } from "next-auth/react"
import { useActiveGroup } from "@/contexts/group-context"
import { NoGroupState } from "@/components/empty-states/no-group-state"
import { useGroups } from "@/hooks/use-groups"
import { cn } from "@/lib/utils"

// Import separated components
import { LoadingWrapper, Loader } from "@/components/ui/loader"
import UserTableRow from "@/components/calculations/user-table-row"
import CalculationsHeader from "@/components/calculations/calculations-header"
import SummaryCards from "@/components/calculations/summary-cards"
import { PageHeader } from "@/components/shared/page-header"

import { formatCurrency } from "@/lib/meal-calculations"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface CalculationsProps {
  roomId?: string;
  initialData?: CalculationsPageData;
}

const MealCalculations = memo(({ roomId, initialData }: CalculationsProps) => {
  const { data: session } = useSession()
  const { activeGroup } = useActiveGroup()
  const { data: userGroups = [], isLoading: isLoadingGroups } = useGroups();
  const { data: currentPeriodFromHook, isLoading: periodLoading } = useCurrentPeriod()
  const currentPeriod = (initialData && initialData.groupId === roomId) ? initialData.currentPeriod : currentPeriodFromHook;
  const { data: allPeriods = [] } = usePeriods(true) // Include archived periods for admin navigation
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)

  // Check if user has no groups - show empty state
  if (!isLoadingGroups && userGroups.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Calculations"
          description="View meal calculations and balances"
        />
        <NoGroupState />
      </div>
    );
  }

  // Always call all hooks
  const userRoleFromHook = activeGroup?.members?.find(m => m.userId === session?.user?.id)?.role
  const userRole = (initialData && initialData.groupId === roomId) ? initialData.userRole : userRoleFromHook;
  const isAdmin = userRole === 'ADMIN'
  const { data: selectedPeriod } = usePeriod(selectedPeriodId || '')
  const periodToUse = selectedPeriodId ? selectedPeriod : currentPeriod

  const currentPeriodIndex = useMemo(() => {
    if (!currentPeriod || !allPeriods.length) return -1
    return allPeriods.findIndex((p: any) => p.id === currentPeriod.id)
  }, [currentPeriod, allPeriods])

  const selectedPeriodIndex = useMemo(() => {
    if (!selectedPeriodId || !allPeriods.length) return currentPeriodIndex
    return allPeriods.findIndex((p: any) => p.id === selectedPeriodId)
  }, [selectedPeriodId, allPeriods, currentPeriodIndex])

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

  const hasPrevious = selectedPeriodIndex > 0
  const hasNext = selectedPeriodIndex < allPeriods.length - 1

  const calcParams = useMemo(() => {
    if (!periodToUse) return null
    return {
      roomId,
      startDate: new Date(periodToUse.startDate),
      endDate: periodToUse.endDate ? new Date(periodToUse.endDate) : new Date(),
      dependencies: [roomId, periodToUse?.id],
    }
  }, [periodToUse, roomId])

  const { data: summary, isLoading } = useRoomCalculations(calcParams ? { ...calcParams, initialData } : { enabled: false, initialData })

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





  // Show not-found card if there is no period after loading is done
  if (!periodToUse && !periodLoading) {
    return (
      <div className="space-y-3">
        <CalculationsHeader
          isAdmin={isAdmin}
          userRole={userRole ?? null}
          currentPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
        <PeriodNotFoundCard
          userRole={userRole}
          groupId={roomId}
          userId={session?.user?.id}
        />
      </div>
    )
  }

  // Main content render

  return (
    <LoadingWrapper isLoading={periodLoading || isLoading || !summary}>
      <div className="space-y-3">
        <CalculationsHeader
          isAdmin={isAdmin}
          userRole={userRole ?? null}
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

              {/* Desktop View - Table */}
              <div className="hidden md:block">
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

              {/* Mobile View - Cards List */}
              <div className="block md:hidden space-y-3">
                {userSummaries.map((user: any) => {
                  const initials = user.userName.split(" ").map((n: string) => n[0]).join("")
                  const balanceColor = user.balance >= 0 ? "text-green-600" : "text-red-600"
                  const badgeVariant = user.balance >= 0 ? "default" : "destructive"
                  const badgeText = user.balance >= 0 ? "Paid" : "Due"

                  return (
                    <div key={user.userId} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.userImage || "/placeholder.svg"} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm truncate uppercase tracking-tight">{user.userName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                {user.mealCount} MEALS
                              </span>
                              <Badge variant={badgeVariant} className="text-[9px] px-1.5 h-4 uppercase font-bold">
                                {badgeText}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                        <div className="space-y-0.5 text-center px-1">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Cost</p>
                          <p className="text-xs font-black">{formatCurrency(user.cost)}</p>
                        </div>
                        <div className="space-y-0.5 text-center border-x border-border/50 px-1">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Paid</p>
                          <p className="text-xs font-black">{formatCurrency(user.paid)}</p>
                        </div>
                        <div className="space-y-0.5 text-center px-1">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Balance</p>
                          <p className={cn("text-xs font-black", balanceColor)}>
                            {formatCurrency(user.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LoadingWrapper>
  )
})

MealCalculations.displayName = "MealCalculations"

export default MealCalculations
