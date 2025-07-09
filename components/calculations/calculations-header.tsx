"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CalculationsHeaderProps {
  isAdmin: boolean
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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Meal Calculations</h2>
        <p className="text-muted-foreground text-sm">View and manage meal costs and balances</p>
      </div>
      
      {isAdmin && (
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <div className="text-center px-2 py-1 bg-muted rounded text-xs min-w-[80px]">
            <div className="text-muted-foreground font-medium text-[10px]">
              {isViewingCurrentPeriod ? "Current" : "Historical"}
            </div>
            {displayPeriod && (
              <div className=" text-[10px]">
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
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
})

CalculationsHeader.displayName = "CalculationsHeader"

export default CalculationsHeader 