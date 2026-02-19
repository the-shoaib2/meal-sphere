"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface LoaderProps {
    className?: string
    size?: "sm" | "md" | "lg"
}

export function Loader({ className, size = "md" }: LoaderProps) {
    const sizeClasses = {
        sm: "w-5 h-5", // 20px
        md: "w-8 h-8", // 32px
        lg: "w-12 h-12" // 48px
    }

    return (
        <div className={cn("relative mx-auto animate-rotate", sizeClasses[size], className)}>
            <svg className="absolute inset-0 w-full h-full transform origin-center" viewBox="25 25 50 50">
                <circle
                    className="animate-dash stroke-blue-600"
                    cx="50"
                    cy="50"
                    r="20"
                    fill="none"
                    strokeWidth="4"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    )
}

export function FullPageLoader() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader size="lg" />
        </div>
    )
}

interface LoadingWrapperProps {
    isLoading: boolean
    children: React.ReactNode
    fallback?: React.ReactNode
    minDisplayTime?: number
}

export function LoadingWrapper({
    isLoading,
    children,
    fallback,
    minDisplayTime = 500
}: LoadingWrapperProps) {
    const [showLoader, setShowLoader] = useState(isLoading)
    const [isFadingOut, setIsFadingOut] = useState(false)
    const [mountTime, setMountTime] = useState(Date.now())

    useEffect(() => {
        let timeout: NodeJS.Timeout

        if (isLoading) {
            setShowLoader(true)
            setIsFadingOut(false)
            setMountTime(Date.now())
        } else {
            const elapsed = Date.now() - mountTime
            const remaining = Math.max(0, minDisplayTime - elapsed)

            timeout = setTimeout(() => {
                setIsFadingOut(true)
                // Wait for fade out animation (300ms matches duration-300)
                setTimeout(() => {
                    setShowLoader(false)
                    setIsFadingOut(false)
                }, 300)
            }, remaining)
        }

        return () => {
            if (timeout) clearTimeout(timeout)
        }
    }, [isLoading, minDisplayTime])

    if (showLoader) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center min-h-[inherit] w-full transition-opacity duration-300 ease-in-out",
                    isFadingOut ? "opacity-0" : "opacity-100"
                )}
            >
                {fallback || <Loader size="lg" />}
            </div>
        )
    }

    return <div className="animate-in fade-in duration-300 w-full">{children}</div>
}
