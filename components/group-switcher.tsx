"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Users } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useGroups } from "@/hooks/use-groups"
import { useSession } from "next-auth/react"

export function GroupSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: groups = [], isLoading } = useGroups()
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null)

  // Set the first group as active when groups are loaded
  React.useEffect(() => {
    if (groups.length > 0 && !activeGroup) {
      setActiveGroup(groups[0].id)
    }
  }, [groups, activeGroup])

  const currentGroup = groups.find(g => g.id === activeGroup) || groups[0]
  const hasGroups = groups.length > 0

  const handleGroupSelect = (groupId: string) => {
    setActiveGroup(groupId)
    // You can add additional logic here when a group is selected
  }

  const handleAddGroup = () => {
    router.push('/groups/create')
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="justify-start">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="ml-3 space-y-1 text-left">
              <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors hover:bg-accent/50"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {hasGroups ? (
                  <Users className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                {hasGroups ? (
                  <>
                    <span className="truncate font-semibold">
                      {currentGroup?.name || 'Select a group'}
                    </span>
                    <span className="truncate text-xs">
                      {currentGroup?.members?.length || 0} members
                    </span>
                  </>
                ) : (
                  <span className="truncate font-semibold">
                    Create your first group
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {hasGroups ? 'Your Groups' : 'No Groups'}
            </DropdownMenuLabel>
            
            {hasGroups ? (
              groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => handleGroupSelect(group.id)}
                  className="gap-2 p-2 rounded-md transition-all duration-200 hover:bg-accent/50 hover:translate-x-1 focus:bg-accent/50 focus:translate-x-1"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm bg-muted">
                    <Users className="size-4 shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {group.members?.length || 0} members
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                You don't have any groups yet.
              </div>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleAddGroup}
              className="gap-2 p-2 rounded-md transition-all duration-200 hover:bg-accent/50 hover:translate-x-1 focus:bg-accent/50 focus:translate-x-1 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium">Create group</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
