"use client"

import { useState, useEffect } from "react"
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
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

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
}

export function SecurityForm({ user }: SecurityFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions')
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }
      const data = await response.json()
      setSessions(data)
    } catch (error) {
      toast.error('Failed to fetch sessions')
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const { t } = useLanguage()





  const handleRevokeSelected = async () => {
    if (selectedSessions.length === 0) {
      toast.error('Please select at least one session to revoke')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionIds: selectedSessions }),
      })

      if (!response.ok) {
        throw new Error('Failed to revoke sessions')
      }

      toast.success('Selected sessions have been revoked')
      setSelectedSessions([])
      // Refresh sessions list
      await fetchSessions()
    } catch (error) {
      toast.error('Failed to revoke sessions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeAll = async () => {
    try {
      setIsLoading(true)
      // TODO: Implement actual session revocation API call
      const response = await fetch('/api/user/sessions/revoke-all', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke all sessions')
      }

      toast.success('All sessions have been revoked')
      setSelectedSessions([])
      // Refresh sessions list
      await fetchSessions()
    } catch (error) {
      toast.error('Failed to revoke all sessions')
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
              <Button onClick={sendVerificationEmail} disabled={isVerifying}>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="destructive"
                  onClick={handleRevokeSelected}
                  disabled={selectedSessions.length === 0 || isLoading}
                >
                  {isLoading ? 'Loading...' : 'Revoke Selected'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRevokeAll}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Revoke All'}
                </Button>
              </div>
              <Badge variant="secondary">
                {sessions.length} active sessions
              </Badge>
            </div>
            <ScrollArea className="h-[400px]">
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
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
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
                        />
                      </TableCell>
                      <TableCell>{session.device || 'N/A'}</TableCell>
                      <TableCell>{session.location || 'N/A'}</TableCell>
                      <TableCell>{session.lastActive || new Date(session.expires).toLocaleString()}</TableCell>
                      <TableCell>{session.ipAddress || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
