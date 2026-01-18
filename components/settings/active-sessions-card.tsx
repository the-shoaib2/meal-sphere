"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "react-hot-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react"
import {
    capitalizeDeviceType,
    formatLocation,
    formatIpAddress,
    getBrowserInfo,
    getCurrentSessionTokenFromBrowser,
} from "@/lib/auth/utils"

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
    userAgent?: string
    city?: string
    country?: string
    latitude?: number
    longitude?: number
    isCurrent?: boolean
    createdAt?: string
    updatedAt?: string
}

interface ActiveSessionsCardProps {
    user: User
}

const TableSkeleton = () => (
    <>
        {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            </TableRow>
        ))}
    </>
)

export function ActiveSessionsCard({ user }: ActiveSessionsCardProps) {
    const isMobile = useIsMobile()
    const [isLoading, setIsLoading] = useState(false)
    const [sessions, setSessions] = useState<Session[]>([])
    const [selectedSessions, setSelectedSessions] = useState<string[]>([])
    const isFetchingRef = useRef(false)

    const fetchSessions = useCallback(async () => {
        if (isFetchingRef.current) return

        try {
            isFetchingRef.current = true
            setIsLoading(true)
            const response = await fetch('/api/auth/sessions')
            if (response.ok) {
                const data = await response.json()
                const currentSessionToken = getCurrentSessionTokenFromBrowser()
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
    }, [fetchSessions])

    const handleRevokeSelected = async () => {
        if (selectedSessions.length === 0) {
            toast.error('Please select at least one session to revoke')
            return
        }

        if (selectedSessions.length > 1) {
            const confirmed = window.confirm(
                `Are you sure you want to revoke ${selectedSessions.length} selected sessions?`
            )
            if (!confirmed) return
        }

        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/sessions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedSessions }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to revoke sessions')
            }

            const result = await response.json()
            toast.success(result.message || 'Selected sessions have been revoked')

            if (result.logoutRequired) {
                toast.success('Your current session was revoked. You will be logged out.')
                await fetch('/api/auth/logout', { method: 'POST' })
                setTimeout(() => {
                    window.location.href = '/login'
                }, 2000)
                return
            }

            setSelectedSessions([])
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

        const confirmed = window.confirm(
            `Are you sure you want to revoke all ${sessions.length} sessions? This will log you out from all devices.`
        )
        if (!confirmed) return

        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/sessions/revoke-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to revoke all sessions')
            }

            const result = await response.json()
            toast.success(result.message || 'All sessions have been revoked')
            toast.success('All sessions have been revoked. You will be logged out.')
            await fetch('/api/auth/logout', { method: 'POST' })
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

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Active Sessions</CardTitle>
                <CardDescription className="text-sm">
                    Manage your active sessions across different devices
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Session Summary */}
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium">Session Summary</h4>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span>Total: {sessions.length}</span>
                                    <span>Current: {sessions.filter(s => s.isCurrent).length}</span>
                                    <span>Other: {sessions.filter(s => !s.isCurrent).length}</span>
                                </div>
                            </div>
                            {sessions.filter(s => s.isCurrent).length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                    <span className="text-blue-700 font-medium">Currently logged in</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                                disabled={isLoading}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                        <Badge variant="secondary" className="w-fit">
                            {sessions.length} sessions
                        </Badge>
                    </div>

                    {/* Mobile Card View */}
                    {isMobile && (
                        <div className="space-y-3">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="p-3 border rounded-lg space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-4 w-4" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-3 w-28" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={`p-3 border rounded-lg space-y-2 ${session.isCurrent
                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={selectedSessions.includes(session.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedSessions([...selectedSessions, session.id])
                                                        } else {
                                                            setSelectedSessions(selectedSessions.filter(id => id !== session.id))
                                                        }
                                                    }}
                                                    disabled={session.isCurrent}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium truncate max-w-[120px] ${session.isCurrent ? 'text-blue-900' : ''
                                                        }`}>
                                                        {session.deviceModel || capitalizeDeviceType(session.deviceType) || 'Unknown Device'}
                                                    </span>
                                                    {session.isCurrent && (
                                                        <Badge variant="default" className="bg-blue-600 text-white text-xs px-2 py-0.5">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                                            <div>
                                                <span className="font-medium text-foreground">Location: </span>
                                                {formatLocation(session.city, session.country, session.ipAddress)}
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">IP: </span>
                                                <span className="font-mono">{formatIpAddress(session.ipAddress)}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">Last Active: </span>
                                                {session.updatedAt ? new Date(session.updatedAt).toLocaleString() :
                                                    new Date(session.expires).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {session.isCurrent && (
                                            <div className="pt-2 border-t border-blue-200">
                                                <div className="flex items-center gap-2 text-xs text-blue-700">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span>This is your current session. You cannot revoke it.</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Desktop Table View */}
                    {!isMobile && (
                        <div className="overflow-x-auto">
                            <ScrollArea className="h-[400px] w-full">
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
                                            <TableHead>Device Type</TableHead>
                                            <TableHead>User Agent</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableSkeleton />
                                        ) : (
                                            sessions.map((session) => (
                                                <TableRow key={session.id} className={session.isCurrent ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' : ''}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedSessions.includes(session.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedSessions([...selectedSessions, session.id])
                                                                } else {
                                                                    setSelectedSessions(selectedSessions.filter(id => id !== session.id))
                                                                }
                                                            }}
                                                            disabled={session.isCurrent}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[120px] truncate" title={session.deviceModel || capitalizeDeviceType(session.deviceType) || 'N/A'}>
                                                            <span className={session.isCurrent ? 'font-medium text-blue-900' : ''}>
                                                                {session.deviceModel || capitalizeDeviceType(session.deviceType) || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[100px] truncate" title={formatLocation(session.city, session.country, session.ipAddress)}>
                                                            {formatLocation(session.city, session.country, session.ipAddress)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[140px] truncate">
                                                            {session.updatedAt ? new Date(session.updatedAt).toLocaleString() :
                                                                new Date(session.expires).toLocaleString()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[100px] truncate font-mono">
                                                            {formatIpAddress(session.ipAddress)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[100px] truncate">
                                                            {capitalizeDeviceType(session.deviceType)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[200px] truncate">
                                                            {session.userAgent ? getBrowserInfo(session.userAgent) : 'N/A'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {session.isCurrent ? (
                                                            <Badge variant="default" className="bg-blue-600 text-white text-xs px-2 py-1">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Current
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-xs">Active</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
