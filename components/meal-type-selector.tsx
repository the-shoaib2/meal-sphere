"use client"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

type MealType = "BREAKFAST" | "LUNCH" | "DINNER"

interface MealTypeSelectorProps {
  selectedTypes: MealType[]
  onChange: (types: MealType[]) => void
  disabled?: boolean
}

export default function MealTypeSelector({ selectedTypes, onChange, disabled = false }: MealTypeSelectorProps) {
  const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"]

  const toggleType = (type: MealType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type))
    } else {
      onChange([...selectedTypes, type])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {mealTypes.map((type) => (
        <Button
          key={type}
          type="button"
          variant={selectedTypes.includes(type) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleType(type)}
          disabled={disabled}
          className="flex items-center"
        >
          {selectedTypes.includes(type) && <Check className="mr-1 h-4 w-4" />}
          {type.charAt(0) + type.slice(1).toLowerCase()}
        </Button>
      ))}
    </div>
  )
}
