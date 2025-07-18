"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { handleNavigation } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    exact?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  // Find the active item based on current path
  const getIsActive = (item: typeof items[0]) => {
    if (!pathname) return false;
    
    const currentPath = pathname as string;
    if (item.exact) {
      return currentPath === item.url
    }
    // For non-exact items, check if path starts with the URL
    // This allows /groups to be active when on /groups/[id]
    return currentPath.startsWith(item.url)
  }



  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = getIsActive(item)
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip={item.title}
                  className={`w-full px-3 transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/10 text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  data-active={isActive}
                  onClick={() => handleNavigation(item.url)}
                >
                  {item.icon && (
                    <item.icon 
                      className={`h-4 w-4 transition-colors ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                  )}
                  <span className="ml-2">
                    {item.title}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
