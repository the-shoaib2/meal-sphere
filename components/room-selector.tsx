"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"

interface Room {
  id: string
  name: string
}

interface RoomSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function RoomSelector({ value, onChange, disabled = false }: RoomSelectorProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/rooms")

        if (!response.ok) {
          throw new Error("Failed to fetch rooms")
        }

        const data = await response.json()
        setRooms(data)

        // Set default room if none selected
        if (!value && data.length > 0) {
          onChange(data[0].id)
        }
      } catch (error) {
        console.error("Error fetching rooms:", error)
        toast.error("Failed to load rooms")
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [onChange, value])

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading rooms..." />
        </SelectTrigger>
      </Select>
    )
  }

  if (rooms.length === 0) {
    return <div className="text-sm text-muted-foreground">No rooms available. Please create or join a room first.</div>
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select a room" />
      </SelectTrigger>
      <SelectContent>
        {rooms.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            {room.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
