"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Users, Check, Loader } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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
import { useGroups } from "@/hooks/use-groups"
import { Group } from "@/types/group"
import { useSession } from "next-auth/react"
import { useActiveGroup } from "@/contexts/group-context"
import { useLoading } from "@/hooks/use-loading"

export function GroupSwitcher() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const { data: session } = useSession()
  const { activeGroup, setActiveGroup, isLoading, groups = [] } = useActiveGroup()
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


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors outline-none cursor-pointer"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden">
            {hasGroups && activeGroup?.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeGroup.bannerUrl}
                alt={activeGroup.name}
                className="object-cover w-full h-full"
              />
            ) : hasGroups ? (
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
        <div className="max-h-[300px] overflow-y-auto gap-1 flex flex-col p-1">
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              onSelect={(e) => {
                e.preventDefault()
                handleGroupSelect(group)
              }}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-sm hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group relative cursor-pointer outline-none",
                activeGroup?.id === group.id
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "text-muted-foreground"
              )}
            >
              {activeGroup?.id === group.id && (
                <div className="absolute left-0 top-1 bottom-1 w-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
              <div className="flex items-center gap-3 min-w-0 w-full">
                <div className="relative h-5 w-5 rounded-full overflow-hidden shrink-0">
                  {group.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.bannerUrl}
                      alt={group.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-primary/10">
                      <Users className={cn(
                        "h-4 w-4 transition-colors",
                        activeGroup?.id === group.id
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400"
                      )} />
                    </div>
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{group.name}</span>
                  {group.userRole && (
                    <span className="truncate text-xs opacity-70">
                      {group.userRole.charAt(0).toUpperCase() + group.userRole.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
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
