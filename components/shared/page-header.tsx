
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
        <div className={cn("flex items-center justify-between gap-4", className)}>
            <div className="space-y-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{heading}</h1>
                {text && <div className="text-muted-foreground text-sm line-clamp-1">{text}</div>}
            </div>
            {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
    )
}
