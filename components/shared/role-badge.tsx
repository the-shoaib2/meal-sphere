
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface RoleBadgeProps {
    role: string | null | undefined
    className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    if (!role) return null

    const isAdmin = role === 'ADMIN'

    return (
        <Badge
            variant="destructive"
            className={cn(
                "shadow-sm transition-all uppercase tracking-widest text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5 shrink-0 cursor-default",
                isAdmin
                    ? ""
                    : "bg-primary/10 text-primary border-primary/20",
                className
            )}
        >
            <Shield className={cn("h-3 w-3", isAdmin ? "fill-[#EA4335]" : "fill-primary")} />
            {role}
        </Badge>
    )
}
