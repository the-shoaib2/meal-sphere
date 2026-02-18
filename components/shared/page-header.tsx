
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
        <div className={cn("mb-4", className)}>
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {heading}
                </h1>
                {children && (
                    <div className="flex items-center gap-2 shrink-0">
                        {children}
                    </div>
                )}
            </div>
            {text && (
                <div className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed">
                    {text}
                </div>
            )}
        </div>
    )
}
