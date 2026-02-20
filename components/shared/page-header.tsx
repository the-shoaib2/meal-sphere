"use client"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
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

    return (
        <div className={cn("mb-4", className)}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-2 w-full sm:w-auto">
                    {showBackButton && (
                        <Button
                            onClick={() => backHref ? router.push(backHref) : router.back()}
                            variant="ghost"
                            size="icon"
                            title="Go back"
                            className="group h-9 w-9 shrink-0 mt-0.5 sm:mt-0 rounded-full bg-muted/80 hover:bg-blue-600 hover:shadow-sm transition-all duration-300 ease-in-out"
                        >
                            <ArrowLeft className="h-[22px] w-[22px] stroke-[2.5] text-blue-600 group-hover:text-white transition-colors duration-300 ease-in-out" />
                        </Button>
                    )}
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                            {heading}
                        </h1>
                        {text && (
                            <div className="text-muted-foreground text-xs sm:text-sm max-w-2xl break-words">
                                {text}
                            </div>
                        )}
                    </div>
                </div>

                {children && (
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-start sm:justify-end overflow-x-auto pb-1 sm:pb-0">
                        {children}
                    </div>
                )}
            </div>

        </div>
    )
}
