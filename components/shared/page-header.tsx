
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
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8", className)}>
            <div className="space-y-1.5 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    {heading}
                </h1>
                {text && (
                    <div className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
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
