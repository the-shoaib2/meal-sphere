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
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex flex-col items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 bg-muted/50 rounded-md border shadow-sm min-w-[70px] sm:min-w-[100px]">
            <span className="text-muted-foreground font-bold text-[8px] sm:text-[10px] uppercase tracking-tighter sm:tracking-wider">
              {isViewingCurrentPeriod ? "Current" : "History"}
            </span>
            {displayPeriod && (
              <span className="text-[10px] sm:text-xs font-black text-foreground truncate max-w-[60px] sm:max-w-none">
                {displayPeriod.name}
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
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