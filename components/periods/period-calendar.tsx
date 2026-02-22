"use client"

import React, { useMemo } from "react"
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
    isToday,
    isSameMonth,
    addMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface PeriodCalendarProps {
    selected?: Date | null
    onSelect: (date: Date) => void
    className?: string
    title?: string
    align?: "start" | "center" | "end"
    placeholder?: string
    disabled?: boolean
    disabledDays?: (date: Date) => boolean
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function PeriodCalendar({
    selected,
    onSelect,
    className,
    title,
    align = "center",
    placeholder = "Pick a date",
    disabled = false,
    disabledDays,
}: PeriodCalendarProps) {
    const [viewDate, setViewDate] = React.useState(() =>
        selected ? startOfMonth(selected) : startOfMonth(new Date())
    )

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

    const prevMonth = () => setViewDate((d) => addMonths(d, -1))
    const nextMonth = () => setViewDate((d) => addMonths(d, 1))

    const calendarContent = (
        <div className={cn("w-full max-w-sm mx-auto select-none p-4", className)}>
            {title && (
                <div className="text-center font-semibold text-xs text-muted-foreground uppercase tracking-widest border-b pb-2">
                    {title}
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between mb-4 p-1">
                <button
                    className="p-2 rounded-full hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors duration-200"
                    onClick={prevMonth}
                    aria-label="Previous Month"
                    type="button"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-semibold text-sm text-foreground">
                    {format(viewDate, "MMMM yyyy")}
                </div>
                <button
                    className="p-2 rounded-full hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors duration-200"
                    onClick={nextMonth}
                    aria-label="Next Month"
                    type="button"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-muted-foreground font-medium uppercase tracking-wider">
                {WEEK_DAYS.map((d) => (
                    <div key={d} className="py-1">
                        {d.substring(0, 3)}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((date, idx) => {
                    const isCurrentMonth = isSameMonth(date, viewDate)
                    const isSelected = selected && isSameDay(date, selected)
                    const today = isToday(date)
                    const isDisabled = disabledDays?.(date)

                    return (
                        <div
                            key={date.toISOString() + idx}
                            className={cn(
                                "relative flex items-center justify-center aspect-square cursor-pointer group transition-all p-0.5",
                                (!isCurrentMonth || isDisabled) && "opacity-20 pointer-events-none"
                            )}
                            onClick={() => isCurrentMonth && !isDisabled && onSelect(date)}
                        >
                            <div
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 transition-all duration-200 rounded-full text-sm",
                                    isSelected
                                        ? "bg-blue-800 text-white shadow-sm font-medium"
                                        : today
                                            ? "text-primary border border-primary/30 bg-primary/5 font-medium"
                                            : "hover:bg-accent hover:text-accent-foreground",
                                    !isCurrentMonth && "text-muted-foreground"
                                )}
                            >
                                {format(date, "d")}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        !selected && 'text-muted-foreground'
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    {selected ? format(selected, 'MMM d, yyyy') : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                {calendarContent}
            </PopoverContent>
        </Popover>
    )
}
