
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    heading: string
    text?: string | ReactNode
    children?: ReactNode
    className?: string
}

export function PageHeader({
    heading,
    text,
    children,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-row items-start justify-between gap-4 mb-4", className)}>
            <div className="space-y-1 min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {heading}
                </h1>
                {text && (
                    <div className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed">
                        {text}
                    </div>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2 shrink-0">
                    {children}
                </div>
            )}
        </div>
    )
}
