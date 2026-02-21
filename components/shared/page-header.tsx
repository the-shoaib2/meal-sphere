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
        <div className={cn("mb-6", className)}>
            <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-3 min-w-0">
                        {showBackButton && (
                            <Button
                                onClick={() => backHref ? router.push(backHref) : router.back()}
                                variant="ghost"
                                size="icon"
                                title="Go back"
                                className="group h-9 w-9 shrink-0 rounded-full bg-muted/80 hover:bg-blue-600 hover:shadow-sm transition-all duration-300 ease-in-out"
                            >
                                <ArrowLeft className="h-[22px] w-[22px] stroke-[2.5] text-blue-600 group-hover:text-white transition-colors duration-300 ease-in-out" />
                            </Button>
                        )}
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                            {heading}
                        </h1>
                    </div>

                    {children && (
                        <div className="flex items-center gap-2 shrink-0 justify-end">
                            {children}
                        </div>
                    )}
                </div>

                {text && (
                    <div className="text-muted-foreground text-sm max-w-2xl break-words pl-0.5">
                        {text}
                    </div>
                )}
            </div>
        </div>
    )
}
