"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Menu, Search as SearchIcon, Utensils, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { NotificationBell } from "./notification-bell"
import { UserAvatar } from "./user-avatar"

const navLinks = [
  { name: 'Recipes', href: '/recipes' },
  { name: 'Meal Plans', href: '/meal-plans' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export function PublicHeader() {
  const router = useRouter()
  const { data: session } = useSession()
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)


  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 backdrop-blur-md px-4 md:px-6">
      <div className="w-full flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Utensils className="h-8 w-8" />
            <span className="font-bold text-xl">MealSphere</span>
          </Link>
          <nav className="hidden md:flex items-center ml-8 space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {session ? (
          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />
            <UserAvatar user={session.user} />
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" size="sm" className="rounded-full px-4" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="default" size="sm" className="rounded-full px-4" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        )}

        {isMobile && (
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[350px]">
            <div className="flex flex-col h-full">
              <SheetHeader className="text-left mb-6">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex-1 space-y-6">
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="block py-2 text-base font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
                <div className="pt-4 border-t space-y-3">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/register" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                  </Button>
                </div>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      )}

      </div>
    </header>
  )
}

