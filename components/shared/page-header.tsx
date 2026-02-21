"use client"
import { ReactNode, useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
    heading: string
    text?: string | ReactNode
    children?: ReactNode
    className?: string
    showBackButton?: boolean
    backHref?: string
}

export function PageHeader({
    heading,
    text,
    children,
    className,
    showBackButton,
    backHref,
}: PageHeaderProps) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [isOverflowing, setIsOverflowing] = useState(false)
    const textRef = useRef<HTMLDivElement>(null)

    // Measure overflow in collapsed state — works on any screen size
    useEffect(() => {
        if (expanded) return // Only measure when collapsed
        const el = textRef.current
        if (!el) return

        const check = () => {
            // scrollHeight > offsetHeight means content is taller than the visible area
            setIsOverflowing(el.scrollHeight > el.offsetHeight + 2)
        }

        check()
        const ro = new ResizeObserver(check)
        ro.observe(el)
        return () => ro.disconnect()
    }, [text, expanded])

    const showToggle = isOverflowing || expanded

    return (
        <div className={cn("mb-6", className)}>
            <div className="flex items-start justify-between gap-3 w-full">

                {/* Left — back button + title + text */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    {showBackButton && (
                        <Button
                            onClick={() => (backHref ? router.push(backHref) : router.back())}
                            variant="ghost"
                            size="icon"
                            title="Go back"
                            className="group h-9 w-9 shrink-0 mt-0.5 rounded-full bg-muted/80 hover:bg-blue-600 hover:shadow-md transition-all duration-300"
                        >
                            <ArrowLeft className="h-[22px] w-[22px] stroke-[2.5] text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </Button>
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                            {heading}
                        </h1>

                        {text && (
                            <div className="mt-0.5">
                                {/* Animated text region */}
                                <div
                                    ref={textRef}
                                    className={cn(
                                        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out text-sm text-muted-foreground",
                                        expanded ? "max-h-40 opacity-100" : "max-h-5 opacity-80"
                                    )}
                                >
                                    <div className={cn(expanded ? "whitespace-normal break-words" : "truncate")}>
                                        {text}
                                    </div>
                                </div>

                                {/* Show toggle only when content actually overflows */}
                                {showToggle && (
                                    <button
                                        onClick={() => setExpanded(v => !v)}
                                        className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium text-primary/70 hover:text-primary transition-colors duration-200"
                                        aria-expanded={expanded}
                                    >
                                        <ChevronDown
                                            className={cn(
                                                "h-3.5 w-3.5 transition-transform duration-300",
                                                expanded ? "rotate-180" : "rotate-0"
                                            )}
                                        />
                                        {expanded ? "Show less" : "Show more"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right — action buttons */}
                {children && (
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        {children}
                    </div>
                )}
            </div>
        </div>
    )
}