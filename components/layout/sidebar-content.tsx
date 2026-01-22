"use client"

import * as React from "react"
import { useState } from "react"
import {
    LogOut,
    LayoutDashboard,
    Users,
    Calendar,
    Utensils,
    ShoppingCart,
    Receipt,
    PieChart,
    Calculator,
    Vote,
    TrendingUp,
    FileSpreadsheet,
    Bell,
    Settings2,
    Loader2,
    type LucideIcon,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { GroupSwitcher } from "@/components/layout/group-switcher"
import { clearLocalStorage } from "@/lib/utils"

type NavItem = {
    title: string
    url: string
    icon: LucideIcon
    items?: NavItem[]
    variant?: "default" | "destructive"
}

type CategoryItem = {
    category: string
}

type TopLevelItem = NavItem | CategoryItem

const data: {
    navItems: TopLevelItem[]
    account: {
        name: string
        icon: LucideIcon
        href: string
        variant?: "default" | "destructive"
    }[]
} = {
    navItems: [
        { category: "Main" },
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Groups", url: "/groups", icon: Users },
        { title: "Periods", url: "/periods", icon: Calendar },

        { category: "Management" },
        { title: "Meals", url: "/meals", icon: Utensils },
        { title: "Shopping", url: "/shopping", icon: ShoppingCart },
        { title: "Expenses", url: "/expenses", icon: Receipt },

        { category: "Financial" },
        { title: "Balance", url: "/account-balance", icon: PieChart },
        { title: "Calculations", url: "/calculations", icon: Calculator },

        { category: "Account" },
        { title: "Settings", url: "/settings", icon: Settings2 },
    ],

    account: [
        { name: "Sign out", icon: LogOut, href: "/signout", variant: "destructive" },
    ],
}

interface SidebarContentProps {
    onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
    const [isSigningOut, setIsSigningOut] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { data: session } = useSession()

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard" || pathname === "/dashboard/"
        }
        if (!pathname) return false
        return pathname.startsWith(href)
    }

    const handleNavigation = async (href: string) => {
        if (href === "/signout") {
            setIsSigningOut(true);
            try {
                // Clear local storage safely
                clearLocalStorage();

                // Direct sign out
                await signOut({ callbackUrl: '/', redirect: true });
            } catch (error) {
                console.error('Sign out error:', error);
                window.location.href = '/';
            } finally {
                setIsSigningOut(false);
            }
        } else {
            if (pathname !== href) {
                // Dispatch event to show loading bar immediately
                window.dispatchEvent(new Event('routeChangeStart'))
            }
            router.push(href)
            onNavigate?.()
        }
    }

    const user = session?.user

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm">
            <div className="space-y-2 px-2 sm:px-0">
                {/* Group Switcher Section */}
                <GroupSwitcher />

                {/* Navigation Items */}
                <div className="space-y-1">
                    {data.navItems.map((item, index) => {
                        if ('category' in item) {
                            return (
                                <div key={`category-${index}`} className="px-3 py-0.5 text-[10px] font-semibold text-muted-foreground tracking-wider mt-2.5 first:mt-0 uppercase opacity-70">
                                    {item.category}
                                </div>
                            )
                        } else {
                            return (
                                <div key={item.title}>
                                    <button
                                        onClick={() => handleNavigation(item.url)}
                                        className={`w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-sm hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group relative cursor-pointer ${isActive(item.url) ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'text-muted-foreground'
                                            }`}
                                    >
                                        {isActive(item.url) && (
                                            <div className="absolute left-0 top-1 bottom-1 w-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                                        )}
                                        <item.icon className={`mr-3 h-4 w-4 transition-colors ${isActive(item.url) ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
                                        <span>{item.title}</span>
                                    </button>
                                </div>
                            )
                        }
                    })}
                </div>

                {/* Account Section */}
                <div className="pt-3 border-t border-border/40 mt-auto">
                    <div className="space-y-1">
                        {data.account.map((item) => {
                            const isDestructive = item.variant === "destructive"
                            const isSignout = item.href === "/signout"
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => handleNavigation(item.href)}
                                    disabled={isSignout && isSigningOut}
                                    className={`w-full flex items-center px-3 py-2 text-sm rounded-sm transition-colors group cursor-pointer ${isDestructive
                                        ? "hover:bg-destructive/10 hover:text-destructive"
                                        : "hover:bg-accent/50"
                                        } ${(isSignout && isSigningOut) ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isSignout && isSigningOut ? (
                                        <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                                    ) : (
                                        <item.icon className={`mr-3 h-4 w-4 transition-colors ${isDestructive ? "text-destructive" : "text-foreground"}`} />
                                    )}
                                    <span className="font-medium">
                                        {isSignout && isSigningOut ? "Signing out..." : item.name}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
