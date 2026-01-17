"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
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
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
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
      // Clear local storage
      localStorage.clear();

      // Direct sign out
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    } finally {
      setLoggingOut(false);
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
              align={isMobile ? "center" : "end"}
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
                <DropdownMenuItem className="focus:bg-transparent" onSelect={(e) => e.preventDefault()}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>Appearance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className={`h-4 w-4 ${resolvedTheme === 'light' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      <Switch
                        checked={theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      />
                      <Moon className={`h-4 w-4 ${resolvedTheme === 'dark' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu >


    </>
  )
}
