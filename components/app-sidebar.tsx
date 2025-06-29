"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Calculator,
  Command,
  CreditCard,
  FileSpreadsheet,
  Frame,
  GalleryVerticalEnd,
  Home,
  LayoutDashboard,
  Map,
  MessageSquare,
  PieChart,
  Receipt,
  Settings2,
  ShoppingCart,
  SquareTerminal,
  TrendingUp,
  Utensils,
  Users,
  Vote,
  Bell
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { GroupSwitcher } from "@/components/group-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useSession } from "next-auth/react"

// Groups are now fetched by the GroupSwitcher component

const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "Groups",
      url: "/groups",
      icon: Users,
      exact: false,
    },
    {
      title: "Meals",
      url: "/meals",
      icon: Utensils,
      exact: false, 
    },
    {
      title: "Shopping",
      url: "/shopping",
      icon: ShoppingCart,
      exact: false,
    },
    {
      title: "Expenses",
      url: "/expenses",
      icon: Receipt,
      exact: false,
    },
    // {
    //   title: "Payments",
    //   url: "/payments",
    //   icon: CreditCard,
    //   exact: false,
    // },
    {
      title: "Balance",
      url: "/account-balance",
      icon: PieChart,
      exact: false,
    },
    {
      title: "Calculations",
      url: "/calculations",
      icon: Calculator,
      exact: false,
    },
    {
      title: "Voting",
      url: "/voting",
      icon: Vote,
      exact: false,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: TrendingUp,
      exact: false,
    },
    {
      title: "Excel",
      url: "/excel",
      icon: FileSpreadsheet,
      exact: false,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      exact: false,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      exact: false,
    },
  ]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession()

  const user = {
    id: session?.user?.id || '',
    name: session?.user?.name || 'Guest',
    email: session?.user?.email || '',
    image: session?.user?.image || undefined,
    role: session?.user?.role || 'guest',
  }

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarHeader>
        <GroupSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
