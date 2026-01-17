"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Users, Check, Loader } from "lucide-react"
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
import { useIsMobile } from "@/hooks/use-mobile"
import { useGroups, Group } from "@/hooks/use-groups"
import { useSession } from "next-auth/react"
import { useActiveGroup } from "@/contexts/group-context"
import { useLoading } from "@/hooks/use-loading"

export function GroupSwitcher() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: groups = [], isLoading } = useGroups()
  const { activeGroup, setActiveGroup, isLoading: isActiveGroupLoading } = useActiveGroup()
  const { startLoading } = useLoading()
  const hasGroups = groups.length > 0



  const handleGroupSelect = (group: Group) => {
    setActiveGroup(group)
    if (isMobile) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }
  }

  const handleAddGroup = () => {
    startLoading()
    router.push('/groups/create')
  }

  if (isLoading || isActiveGroupLoading) {
    return (
      <div className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Loader className="size-4 animate-spin" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1"></div>
          <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
        </div>
        <ChevronsUpDown className="ml-auto opacity-50 size-4" />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
                <span className="truncate text-xs flex items-center gap-1 text-muted-foreground">
                  {activeGroup?.memberCount || activeGroup?._count?.members || 0} members
                </span>
              </>
            ) : (
              <span className="truncate font-semibold">
                Create first group
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-auto size-4 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <DropdownMenuLabel className="flex justify-between items-center text-xs text-muted-foreground">
          <span>My Groups</span>
          <span className="font-normal">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              onClick={() => handleGroupSelect(group)}
              className="flex items-center justify-between gap-2 p-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Users className="size-3 shrink-0" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{group.name}</span>
                  {group.userRole && (
                    <span className="truncate text-xs text-muted-foreground">
                      {group.userRole.charAt(0).toUpperCase() + group.userRole.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
              {activeGroup?.id === group.id && (
                <Check className="h-4 w-4 text-primary ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleAddGroup}
          className="gap-2 p-2 text-primary focus:text-primary cursor-pointer"
        >
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Plus className="size-4" />
          </div>
          <div className="font-medium text-muted-foreground">
            Create new group
          </div>
        </DropdownMenuItem>
        {hasGroups && (
          <DropdownMenuItem
            onClick={() => {
              startLoading();
              router.push('/groups');
            }}
            className="gap-2 p-2 text-muted-foreground cursor-pointer"
          >
            <div className="flex size-6 items-center justify-center rounded-md border bg-background">
              <ChevronsUpDown className="size-4" />
            </div>
            <div className="font-medium">
              Manage all groups
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
