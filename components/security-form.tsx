"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    newPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type PasswordFormValues = z.infer<typeof passwordFormSchema>

interface SecurityFormProps {
  user: User
}

interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: Date
  device?: string
  location?: string
  lastActive?: string
  ipAddress?: string
  deviceType?: string
  deviceModel?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  isCurrent?: boolean
}

// Skeleton component for table rows
const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-4 w-4" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-20" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-20" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
      </TableRow>
    ))}
  </>
)

export function SecurityForm({ user }: SecurityFormProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const isFetchingRef = useRef(false)

  const fetchSessions = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return
    }

    try {
      isFetchingRef.current = true
      setIsLoading(true)
      const response = await fetch('/api/auth/sessions')
      if (response.ok) {
        const data = await response.json()
        
        // Get current session token from cookies to identify current session
        const currentSessionToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('next-auth.session-token='))
          ?.split('=')[1] || 
          document.cookie
          .split('; ')
          .find(row => row.startsWith('__Secure-next-auth.session-token='))
          ?.split('=')[1]
        
        // Mark current session
        const sessionsWithCurrent = data.map((session: Session) => ({
          ...session,
          isCurrent: session.sessionToken === currentSessionToken
        }))
        setSessions(sessionsWithCurrent)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toast.error('Failed to fetch sessions')
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions]) // Empty dependency array - only run once on mount

  const { t } = useLanguage()

  const handleRevokeSelected = async () => {
    if (selectedSessions.length === 0) {
      toast.error('Please select at least one session to revoke')
      return
    }

    // Add confirmation dialog for multiple sessions
    if (selectedSessions.length > 1) {
      const confirmed = window.confirm(
        `Are you sure you want to revoke ${selectedSessions.length} selected sessions?`
      )
      
      if (!confirmed) {
        return
      }
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedSessions }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to revoke sessions')
      }

      const result = await response.json()
      toast.success(result.message || 'Selected sessions have been revoked')
      
      // Check if logout is required
      if (result.logoutRequired) {
        toast.success('Your current session was revoked. You will be logged out.')
        // Call logout API to properly clear session
        await fetch('/api/auth/logout', { method: 'POST' })
        // Wait a moment for the toast to be visible, then redirect
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
        return // Don't refresh sessions or clear selection since we're logging out
      }
      
      setSelectedSessions([])
      // Refresh sessions list only if not logging out
      await fetchSessions()
    } catch (error: any) {
      console.error('Error revoking sessions:', error)
      toast.error(error.message || 'Failed to revoke sessions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeAll = async () => {
    if (sessions.length === 0) {
      toast.error('No sessions to revoke')
      return
    }

    // Add confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to revoke all ${sessions.length} active sessions? This will log you out from all devices.`
    )

    if (!confirmed) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: sessions.map(s => s.id) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to revoke all sessions')
      }

      const result = await response.json()
      toast.success(result.message || 'All sessions have been revoked')
      
      // For revoke all, always logout since current session is included
      toast.success('All sessions have been revoked. You will be logged out.')
      // Call logout API to properly clear session
      await fetch('/api/auth/logout', { method: 'POST' })
      // Wait a moment for the toast to be visible, then redirect
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
      
    } catch (error: any) {
      console.error('Error revoking all sessions:', error)
      toast.error(error.message || 'Failed to revoke all sessions')
    } finally {
      setIsLoading(false)
    }
  }

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: PasswordFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update password")
      }

      toast.success("Password updated successfully")
      form.reset()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to update password")
    } finally {
      setIsLoading(false)
    }
  }

  async function sendVerificationEmail() {
    setIsVerifying(true)

    try {
      const response = await fetch("/api/user/verify-email", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to send verification email")
      }

      toast.success("Verification email sent successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to send verification email")
    } finally {
      setIsVerifying(false)
    }
  }

  async function updateCurrentSession() {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/update-session", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to update session")
      }

      toast.success("Session updated successfully")
      // Refresh sessions to show updated info
      await fetchSessions()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update session")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Verify your email address to secure your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.emailVerified ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Email Verified</AlertTitle>
              <AlertDescription className="text-green-700">
                Your email has been verified on {new Date(user.emailVerified).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Email Not Verified</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Please verify your email address to secure your account.
                </AlertDescription>
              </Alert>
              <Button onClick={sendVerificationEmail} disabled={isVerifying} className="w-full sm:w-auto">
                {isVerifying ? "Sending..." : "Send Verification Email"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active sessions across different devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={handleRevokeSelected}
                  disabled={selectedSessions.length === 0}
                  size="sm"
                >
                  Revoke Selected
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRevokeAll}
                  size="sm"
                >
                  Revoke All
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchSessions}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="secondary" className="w-fit self-start sm:self-center">
                {sessions.length} active sessions
              </Badge>
            </div>
            <ScrollArea className="h-[400px] w-full">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]">
                        <Checkbox
                          checked={selectedSessions.length === sessions.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSessions(sessions.map(s => s.id))
                            } else {
                              setSelectedSessions([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className={isMobile ? "hidden" : ""}>Device</TableHead>
                      <TableHead className={isMobile ? "hidden" : ""}>Location</TableHead>
                      <TableHead className={isMobile ? "hidden" : ""}>Last Active</TableHead>
                      <TableHead className={isMobile ? "hidden" : ""}>IP Address</TableHead>
                      <TableHead className={isMobile ? "hidden" : ""}>Device Type</TableHead>
                      <TableHead className={isMobile ? "hidden" : ""}>Device Model</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton />
                    ) : (
                      sessions.map((session) => (
                        <TableRow key={session.id} className={session.isCurrent ? 'bg-blue-50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSessions.includes(session.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSessions([...selectedSessions, session.id])
                                } else {
                                  setSelectedSessions(
                                    selectedSessions.filter(id => id !== session.id)
                                  )
                                }
                              }}
                              disabled={session.isCurrent}
                            />
                          </TableCell>
                          <TableCell className={isMobile ? "hidden" : ""}>
                            <div className="max-w-[120px] truncate" title={session.device || 'N/A'}>
                              {session.device || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className={isMobile ? "hidden" : ""}>
                            <div className="max-w-[100px] truncate" title={session.city && session.country ? `${session.city}, ${session.country}` : session.city || session.country || 'Unknown Location'}>
                              {session.city && session.country ? `${session.city}, ${session.country}` : 
                               session.city || session.country || 'Unknown Location'}
                            </div>
                          </TableCell>
                          <TableCell className={isMobile ? "hidden" : ""}>
                            <div className="max-w-[140px] truncate" title={session.lastActive || new Date(session.expires).toLocaleString()}>
                              {session.lastActive || new Date(session.expires).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className={isMobile ? "hidden" : ""}>
                            <div className="max-w-[100px] truncate" title={session.ipAddress || 'N/A'}>
                              {session.ipAddress || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className={isMobile ? "hidden" : ""}>
                            <div className="max-w-[100px] truncate" title={session.deviceType || 'N/A'}>
                              {session.deviceType || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className={isMobile ? "hidden" : ""}>
                            <div className="max-w-[120px] truncate" title={session.deviceModel || 'N/A'}>
                              {session.deviceModel || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.isCurrent ? (
                              <Badge variant="default" className="bg-blue-600 text-xs">Current</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
