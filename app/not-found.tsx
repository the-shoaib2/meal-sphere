"use client"
import "./globals.css"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, ChefHat, Calendar, LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { SessionProvider } from "@/components/providers/session-provider"

export const dynamic = 'force-dynamic'

function NotFoundContent() {
  const router = useRouter()
  const { data: session } = useSession()

  const quickLinks = [
    { name: "Home", href: "/", icon: Home },
    ...(session ? [{ name: "Dashboard", href: "/dashboard", icon: Calendar }] : []),
    { name: "Groups", href: "/groups", icon: ChefHat },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-destructive">404</span>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Page Not Found</CardTitle>
            <p className="text-sm text-muted-foreground">
              The page you're looking for doesn't exist.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Links */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Links</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickLinks.map((link) => (
                <Button key={link.name} variant="outline" size="sm" asChild className="h-auto py-2">
                  <Link href={link.href}>
                    <link.icon className="w-4 h-4 mr-1" />
                    {link.name}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {session ? (
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild className="flex-1">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Help Link */}
          <div className="text-center pt-2 border-t">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contact">Need Help?</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NotFound() {
  return (
    <SessionProvider>
      <NotFoundContent />
    </SessionProvider>
  )
} 