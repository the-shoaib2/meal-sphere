"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { RoleBadge } from "@/components/shared/role-badge"

interface CalculationsHeaderProps {
  isAdmin: boolean
  userRole: string | null
  currentPeriod: any
  selectedPeriodId: string | null
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
}

// Memoized header component with period navigation
const CalculationsHeader = memo(({
  isAdmin,
  userRole,
  currentPeriod,
  selectedPeriodId,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}: CalculationsHeaderProps) => {
  const isViewingCurrentPeriod = !selectedPeriodId || selectedPeriodId === currentPeriod?.id
  const displayPeriod = selectedPeriodId ? null : currentPeriod

  return (
    <PageHeader
      heading="Meal Calculations"
      description="View and manage meal costs and balances"
      badges={<RoleBadge role={userRole} />}
      badgesNextToTitle={true}
      collapsible={false}
    >
      {isAdmin && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center px-3 py-1 bg-muted/50 rounded-md border shadow-sm min-w-[100px]">
            <div className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
              {isViewingCurrentPeriod ? "Current" : "Historical"}
            </div>
            {displayPeriod && (
              <div className="text-xs font-bold text-foreground">
                {displayPeriod.name}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </PageHeader>
  )
})

CalculationsHeader.displayName = "CalculationsHeader"

export default CalculationsHeader 