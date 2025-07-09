"use client"
import { useMemo } from "react"
import MealCalculations from "@/components/calculations/calculations"
import { useActiveGroup } from "@/contexts/group-context"

const CalculationsPage = () => {
  const { activeGroup, isLoading } = useActiveGroup()
  
  const roomId = useMemo(() => {
    return activeGroup?.id
  }, [activeGroup?.id])

  return <MealCalculations roomId={roomId} />
}

export default CalculationsPage
