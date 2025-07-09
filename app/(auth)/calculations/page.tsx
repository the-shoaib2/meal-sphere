"use client"
import { useMemo } from "react"
import MealCalculations from "@/components/calculations"
import { useActiveGroup } from "@/contexts/group-context"

const CalculationsPage = ({ roomId: propRoomId }: { roomId?: string }) => {
  const { activeGroup, isLoading } = useActiveGroup()
  
  const roomId = useMemo(() => {
    return propRoomId || activeGroup?.id
  }, [propRoomId, activeGroup?.id])

  return <MealCalculations roomId={roomId} />
}

export default CalculationsPage
