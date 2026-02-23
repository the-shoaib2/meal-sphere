"use client";

import { useState } from "react";
import { Settings, LayoutDashboard, Sun, Moon, Laptop, User, LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { handleNavigation, clearLocalStorage } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
interface UserAvatarProps {
  user: {
    id: string;
    name?: string | undefined;
    email?: string | undefined;
    image?: string | undefined;
    role?: string;
  } | null | undefined;
  className?: string;
}

export function UserAvatar({ user, className = '' }: UserAvatarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const { status } = useSession();

  // 1. Loading State (Hydration/Session Fetching)
  if (user === undefined || status === "loading") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
      </div>
    );
  }

  // 2. Unauthenticated State (Show Guest Avatar)
  const isAuthenticated = status === "authenticated" && !!user;

  // 3. User initials logic
  const initials = isAuthenticated && user?.name
    ? user.name
      .split(" ")
      .filter(n => (n && typeof n === 'string' && n.length > 0))
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`group rounded-full flex-shrink-0 relative focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${className}`}
          >
            <Avatar className="h-9 w-9 border border-border/50 ring-offset-background transition-shadow group-hover:shadow-md">
              {isAuthenticated && user?.image ? (
                <AvatarImage
                  src={user.image}
                  alt={user.name || "User"}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-[11px] select-none" suppressHydrationWarning>
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-64 rounded-lg shadow-2xl p-1.5" align="end" sideOffset={8} side="bottom">
          <DropdownMenuLabel className="p-2.5 font-normal">
            <div className="flex items-center gap-3 text-left">
              <Avatar className="h-10 w-10 rounded-full border border-border/50">
                {isAuthenticated && user?.image ? (
                  <AvatarImage src={user.image} alt={user.name || "User"} className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-full bg-muted text-muted-foreground font-bold" suppressHydrationWarning>
                  {initials || <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 leading-tight">
                <span className="truncate font-semibold text-sm text-foreground">
                  {isAuthenticated ? (user?.name || "User") : "Guest User"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {isAuthenticated ? user?.email : "Sign in to manage meals"}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuGroup className="space-y-0.5">
            {isAuthenticated ? (
              <>
                <DropdownMenuItem asChild>
                  <button
                    className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleNavigation('/dashboard')}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    <span>Dashboard</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleNavigation('/settings')}
                  >
                    <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    <span>Settings</span>
                  </button>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <button
                  className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleNavigation('/login')}
                >
                  <LogIn className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  <span>Sign In</span>
                </button>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className="px-2.5 py-2 rounded-lg focus:bg-transparent" onSelect={(e) => e.preventDefault()}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center text-sm">
                  <Laptop className="mr-4 h-4 w-4 text-muted-foreground" />
                  <span>Theme</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className={`h-3.5 w-3.5 ${resolvedTheme === 'light' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    className="scale-90"
                  />
                  <Moon className={`h-3.5 w-3.5 ${resolvedTheme === 'dark' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-1.5" />
          {isAuthenticated && (
            <DropdownMenuItem
              className="p-0 focus:bg-transparent"
              onSelect={(e) => e.preventDefault()}
            >
              <SignOutDialog variant="avatar" className="w-full" />
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  );
}
