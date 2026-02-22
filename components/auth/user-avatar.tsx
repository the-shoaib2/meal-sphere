"use client";

import { useState } from "react";
import { Settings, LogOut, LayoutDashboard, Sun, Moon, Laptop, Loader2 } from "lucide-react";
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
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const { status } = useSession();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      clearLocalStorage();
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    } finally {
      setLoggingOut(false);
    }
  };

  // 1. Loading State (Hydration/Session Fetching)
  if (user === undefined || status === "loading") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
      </div>
    );
  }

  // 2. Not Logged In
  if (user === null) return null;

  // 3. User initials logic
  const initials = user.name
    ? user.name
      .split(" ")
      .filter(n => n.length > 0)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`group rounded-full flex-shrink-0 relative focus-visible:ring-0 focus fing  ${className}`}
          >
            <Avatar className="h-8 w-8 border border-border/50 ring-offset-background">
              <AvatarImage
                src={user.image || ""}
                alt={user.name || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-[11px] select-none" suppressHydrationWarning>
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-64 rounded-xl shadow-2xl p-1.5" align="end" sideOffset={8} side="bottom">
          <DropdownMenuLabel className="p-2.5 font-normal">
            <div className="flex items-center gap-3 text-left">
              <Avatar className="h-10 w-10 rounded-full border border-border/50">
                <AvatarImage src={user.image || ""} alt={user.name || "User"} className="object-cover" />
                <AvatarFallback className="rounded-full bg-muted text-muted-foreground font-bold" suppressHydrationWarning>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 leading-tight">
                <span className="truncate font-semibold text-sm text-foreground">{user.name || "User"}</span>
                {user.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuGroup className="space-y-0.5">
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
          <DropdownMenuItem
            className="px-2.5 py-2 hover:bg-red-500/10 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2.5" />
            ) : (
              <LogOut className="h-4 w-4 mr-2.5 text-red-500 hover:text-red-500 transition-colors" />
            )}
            <span className="font-medium cursor-pointer text-red-500 hover:text-red-500 transition-colors">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  );
}
