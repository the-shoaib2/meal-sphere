"use client"
import { ReactNode, useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
    heading: string
    description?: string | ReactNode
    badges?: ReactNode
    children?: ReactNode // Used for actions
    className?: string
    showBackButton?: boolean
    backHref?: string
    badgesNextToTitle?: boolean
    collapsible?: boolean
}

export function PageHeader({
    heading,
    description,
    badges,
    children,
    className,
    showBackButton,
    backHref,
    badgesNextToTitle = false,
    collapsible = true,
}: PageHeaderProps) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [isOverflowing, setIsOverflowing] = useState(false)
    const textRef = useRef<HTMLDivElement>(null)

    const resolvedDescription = description

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
    }, [resolvedDescription, expanded])

    const showToggle = isOverflowing || expanded

    return (
        <div className={cn("mb-2 sm:mb-4 space-y-1", className)}>
            <div className="flex items-center justify-between gap-3 w-full">
                {/* Left — back button + title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {showBackButton && (
                        <Button
                            onClick={() => (backHref ? router.push(backHref) : router.back())}
                            variant="ghost"
                            size="icon"
                            title="Go back"
                            className="group h-8 w-8 shrink-0 rounded-full bg-muted/50 hover:bg-blue-600 hover:shadow-lg transition-all duration-300"
                        >
                            <ArrowLeft className="h-4 w-4 stroke-[2.5] text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </Button>
                    )}
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
                            {heading}
                        </h1>
                        {badgesNextToTitle && badges && (
                            <div className="flex flex-wrap items-center gap-2">
                                {badges}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right — action buttons (Always in one row) */}
                {children && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {children}
                    </div>
                )}
            </div>

            {/* Description and Badges Row (Always 2nd row) */}
            {(resolvedDescription || badges) && (
                <div className={cn("flex flex-col gap-1.5", showBackButton && "pl-10")}>
                    {resolvedDescription && (
                        <div className="max-w-3xl">
                            <div
                                ref={textRef}
                                className={cn(
                                    "overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out text-sm leading-tight text-muted-foreground",
                                    !collapsible || expanded ? "max-h-96 opacity-100" : "max-h-4 opacity-80"
                                )}
                            >
                                <div className={cn(!collapsible || expanded ? "whitespace-normal break-words" : "truncate")}>
                                    {resolvedDescription}
                                </div>
                            </div>

                            {collapsible && showToggle && (
                                <button
                                    onClick={() => setExpanded(v => !v)}
                                    className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-primary/80 hover:text-primary transition-all duration-200"
                                    aria-expanded={expanded}
                                >
                                    <ChevronDown
                                        className={cn(
                                            "h-3 w-3 transition-transform duration-300",
                                            expanded ? "rotate-180" : "rotate-0"
                                        )}
                                    />
                                    {expanded ? "Show less" : "Show more"}
                                </button>
                            )}
                        </div>
                    )}

                    {!badgesNextToTitle && badges && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {badges}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}