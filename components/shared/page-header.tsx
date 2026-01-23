
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
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
            <div className="space-y-1 min-w-0">
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
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {children}
                </div>
            )}
        </div>
    )
}
