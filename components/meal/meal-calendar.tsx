import React, { useMemo } from "react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isToday, isSameMonth, isBefore, isAfter, startOfDay } from "date-fns"
import { ChevronLeft, ChevronRight, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"

interface Period {
  name: string
  startDate: Date | string
  endDate?: Date | string | null
}

interface MealCalendarProps {
  selected: Date
  onSelect: (date: Date) => void
  getMealCount: (date: Date) => number
  isLoading?: boolean
  period?: Period | null
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function MealCalendar({ selected, onSelect, getMealCount, isLoading, period }: MealCalendarProps) {
  const [viewDate, setViewDate] = React.useState(() => startOfMonth(selected))

  // Normalise period dates to Date objects
  const periodStart = useMemo(() =>
    period?.startDate ? startOfDay(new Date(period.startDate)) : null
    , [period?.startDate])

  const periodEnd = useMemo(() =>
    period?.endDate ? startOfDay(new Date(period.endDate)) : null
    , [period?.endDate])

  // Returns true when a date is outside the period range and should be disabled
  const isDisabled = (date: Date): boolean => {
    if (!periodStart) return false
    const d = startOfDay(date)
    if (isBefore(d, periodStart)) return true
    if (periodEnd && isAfter(d, periodEnd)) return true
    return false
  }

  // Generate calendar grid
  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate))
    const end = endOfWeek(endOfMonth(viewDate))
    const days: Date[][] = []
    let week: Date[] = []
    let day = start
    while (day <= end) {
      week.push(day)
      if (week.length === 7) {
        days.push(week)
        week = []
      }
      day = addDays(day, 1)
    }
    return days
  }, [viewDate])

  // Responsive tooltip/popover
  const [hovered, setHovered] = React.useState<Date | null>(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  // Navigation
  const prevMonth = () => setViewDate(d => addDays(startOfMonth(d), -1))
  const nextMonth = () => setViewDate(d => addDays(endOfMonth(d), 1))

  React.useEffect(() => {
    setViewDate(startOfMonth(selected))
  }, [selected])

  return (
    <div className="w-full max-w-md mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-1">
        <button
          className="p-2 rounded-full cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
          onClick={prevMonth}
          aria-label="Previous Month"
          type="button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-0.5">
          {period?.name && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 leading-none">
              {period.name}
            </span>
          )}
          <div className="font-semibold text-lg text-center text-foreground">
            {format(viewDate, "MMMM yyyy")}
          </div>
        </div>
        <button
          className="p-2 rounded-full cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
          onClick={nextMonth}
          aria-label="Next Month"
          type="button"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-xs sm:text-sm text-center text-muted-foreground font-medium">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-1.5">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, idx) => {
          const mealCount = getMealCount(date)
          const isCurrentMonth = isSameMonth(date, viewDate)
          const isSelected = isSameDay(date, selected)
          const today = isToday(date)
          const showPopover = hovered && isSameDay(hovered, date)
          const disabled = isDisabled(date)

          return (
            <div
              key={date.toISOString() + idx}
              className={cn(
                "relative flex flex-col items-center justify-center aspect-square group transition-all p-1",
                !isCurrentMonth && "opacity-40",
                isSelected && "z-10",
                disabled ? "cursor-not-allowed opacity-30" : "cursor-pointer"
              )}
              onClick={() => isCurrentMonth && !disabled && onSelect(date)}
              onMouseEnter={() => !disabled && setHovered(date)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => isMobile && !disabled && setHovered(date)}
              onTouchEnd={() => isMobile && setHovered(null)}
              tabIndex={disabled ? -1 : 0}
              aria-label={format(date, "PPP")}
              aria-disabled={disabled}
            >
              {/* Date number */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 transition-all duration-200 rounded-full",
                  "border-2 border-transparent",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                  today && !isSelected && "text-primary border-primary/30 bg-primary/5 font-medium",
                  isSelected
                    ? "bg-blue-800 text-white shadow-md scale-105"
                    : !disabled && "hover:bg-accent/50 hover:border-accent",
                  !isSelected && !today && isCurrentMonth && !disabled && "hover:bg-accent/30"
                )}
              >
                <span className={cn(
                  "transition-transform duration-200",
                  (isSelected || today) && "scale-110"
                )}>
                  {format(date, "d")}
                </span>
              </div>
              {/* Meal count at bottom */}
              <div className={cn(
                "mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-xs transition-all",
                isSelected
                  ? "bg-primary-foreground/10 text-primary"
                  : "text-muted-foreground/70",
                mealCount > 0 && !isLoading ? "opacity-100" : "opacity-0"
              )}>
                {isLoading ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
                ) : mealCount > 0 && (
                  <>
                    <Utensils className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="text-[10px] font-medium ml-0.5">{mealCount}</span>
                  </>
                )}
              </div>
              {/* Popover/Tooltip */}
              {showPopover && !disabled && (
                <div className="absolute z-20 bottom-14 left-1/2 -translate-x-1/2 bg-popover border rounded-xl shadow-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap animate-fade-in backdrop-blur-sm">
                  <div className="font-medium">{format(date, "EEEE, MMM d")}</div>
                  <div className="text-muted-foreground">
                    <span className="font-medium">{mealCount}</span> meal{mealCount !== 1 ? 's' : ''} planned
                  </div>
                  {period?.name && (
                    <div className="text-muted-foreground/70 text-[10px] mt-0.5">{period.name}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default React.memo(MealCalendar)