"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  Laptop,
  Loader2,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useProfileImage } from "@/hooks/use-profile-image"
import { handleNavigation } from "@/lib/utils"

interface NavUserProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  } | null | undefined
  className?: string
}

export function NavUser({ user, className = '' }: NavUserProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isMobile } = useSidebar();
  const { image, getInitials, isLoaded } = useProfileImage({
    initialImage: user?.image
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  const getThemeIcon = () => {
    if (!mounted) return <Laptop className="h-4 w-4 mr-2" />;

    const currentTheme = resolvedTheme || theme;

    switch (currentTheme) {
      case 'light':
        return <Sun className="h-4 w-4 mr-2" />;
      case 'dark':
        return <Moon className="h-4 w-4 mr-2" />;
      default:
        return <Laptop className="h-4 w-4 mr-2" />;
    }
  };

  const isThemeActive = (themeName: string) => {
    if (!mounted) return false;
    return theme === themeName || resolvedTheme === themeName;
  };

  if (!user) return null

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-mute hover:bg-accent/80 hover:text-accent-foreground transition-colors duration-200"
              >
                <Avatar className="h-8 w-8 rounded-full">
                  {isLoaded && image ? (
                    <AvatarImage src={image} alt={user.name || "User"} />
                  ) : (
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align={isMobile? "center" : "end"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-10 w-10 rounded-full">
                    {isLoaded && image ? (
                      <AvatarImage src={image} alt={user.name || "User"} />
                    ) : (
                      <AvatarFallback className="rounded-full">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name || "User"}</span>
                    {user.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className="transition-colors duration-200 hover:bg-accent/80">
                  <button
                    className="w-full flex items-center cursor-pointer"
                    onClick={() => handleNavigation('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer w-full transition-colors duration-200 hover:bg-accent/80 focus:bg-accent/80">
                    {getThemeIcon()}
                    <span>Appearance</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className={`z-[100] ${isMobile ? "w-32" : "w-48"}`}>
                      <DropdownMenuItem
                        className={`cursor-pointer ${isThemeActive('light') ? 'bg-accent' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setTheme('light');
                        }}
                      >
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                        {isThemeActive('light') && (
                          <span className="ml-auto">✓</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`cursor-pointer ${isThemeActive('dark') ? 'bg-accent' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setTheme('dark');
                        }}
                      >
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                        {isThemeActive('dark') && (
                          <span className="ml-auto">✓</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`cursor-pointer ${isThemeActive('system') ? 'bg-accent' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setTheme('system');
                        }}
                      >
                        <Laptop className="mr-2 h-4 w-4" />
                        <span>System</span>
                        {isThemeActive('system') && (
                          <span className="ml-auto">✓</span>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={loggingOut ? undefined : setShowLogoutDialog}>
        <AlertDialogContent className="rounded-lg w-[90vw] p-4 sm:max-w-sm sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center"
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
