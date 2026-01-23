"use client"

import { useState, useEffect } from "react"

interface SafeDateProps {
    date: Date | string | number
    format?: (date: Date) => string
    fallback?: React.ReactNode
    className?: string
}

/**
 * SafeDate component to prevent hydration mismatches (React Error #418).
 * It renders a fallback (or nothing) on the server and initial client render,
 * then renders the formatted date after mounting.
 */
export function SafeDate({
    date,
    format,
    fallback = null,
    className
}: SafeDateProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <span className={className}>{fallback}</span>
    }

    const dateObj = date instanceof Date ? date : new Date(date)

    // Basic default format if none provided (toLocaleDateString)
    return (
        <span className={className}>
            {format ? format(dateObj) : dateObj.toLocaleString()}
        </span>
    )
}
