"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Users, Check } from "lucide-react"
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
import { useGroups, Group } from "@/hooks/use-groups"
import { useSession } from "next-auth/react"
import { useActiveGroup } from "@/contexts/group-context"

export function GroupSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: groups = [], isLoading } = useGroups()
  const { activeGroup, setActiveGroup } = useActiveGroup()
  const hasGroups = groups.length > 0

  // Set the first group as active when groups are loaded and no group is selected
  React.useEffect(() => {
    if (groups.length > 0 && !activeGroup) {
      setActiveGroup(groups[0])
    }
  }, [groups, activeGroup, setActiveGroup])

  const handleGroupSelect = (group: Group) => {
    setActiveGroup(group)
    // Close the dropdown on mobile after selection
    if (isMobile) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }
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
                      {activeGroup?.name || 'Select a group'}
                    </span>
                    <span className="truncate text-xs">
                      {activeGroup?.members?.length || 0} members • {activeGroup?.role || 'Member'}
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
            className="w-72"
            align="start"
            side={isMobile ? "bottom" : "right"}
          >
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>My Groups</span>
              <span className="text-xs font-normal text-muted-foreground">
                {groups.length} {groups.length === 1 ? 'group' : 'groups'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => handleGroupSelect(group)}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <span className="truncate max-w-[180px]">{group.name}</span>
                    {group.role === 'ADMIN' && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-2">
                      {group.members?.length || 0} members
                    </span>
                    {activeGroup?.id === group.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleAddGroup}
              className="text-primary focus:text-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create new group
              <DropdownMenuShortcut>⌘+N</DropdownMenuShortcut>
            </DropdownMenuItem>
            {hasGroups && (
              <DropdownMenuItem
                onClick={() => router.push('/groups')}
                className="text-muted-foreground text-xs"
              >
                Manage all groups
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
