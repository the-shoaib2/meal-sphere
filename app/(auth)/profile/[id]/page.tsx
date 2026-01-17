"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Mail, User as UserIcon, Shield, Component } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useParams } from "next/navigation"

interface Room {
    id: string
    name: string
    description: string
    category: string
    memberCount: number
}

interface RoomMember {
    role: string
    room: Room
}

interface UserProfile {
    id: string
    name: string
    email: string
    image: string | null
    role?: string
    createdAt: string
    rooms: RoomMember[]
}

export default function ProfilePage() {
    const params = useParams()
    const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null

    const { data: user, isLoading: loading } = useQuery({
        queryKey: ["user", id],
        queryFn: async () => {
            if (!id) return null
            const response = await fetch(`/api/users/${id}`)
            if (!response.ok) {
                throw new Error("Failed to fetch user")
            }
            return response.json() as Promise<UserProfile>
        },
        enabled: !!id,
    })

    if (loading) {
        return (
            <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in-50">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="container flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <h2 className="text-2xl font-bold">User not found</h2>
                <p className="text-muted-foreground">The user you are looking for does not exist.</p>
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                <Avatar className="h-32 w-32 border-4 border-muted">
                    <AvatarImage src={user.image || ""} alt={user.name} />
                    <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                        {user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left space-y-2 pt-2">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
                        {user.role && (
                            <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'} className="uppercase text-xs" >
                                {user.role}
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 text-muted-foreground">
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-primary" />
                            Profile Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground font-medium">Full Name</p>
                                <p>{user.name}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-medium">Role</p>
                                <p className="capitalize">{(user.role || 'Member').toLowerCase().replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-medium">Status</p>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Groups Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Component className="h-5 w-5 text-primary" />
                            Groups & Rooms
                        </CardTitle>
                        <CardDescription>
                            Groups this user is a member of
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user.rooms.length > 0 ? (
                            <div className="space-y-4">
                                {user.rooms.map((member) => (
                                    <div key={member.room.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="space-y-1">
                                            <p className="font-medium leading-none">{member.room.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.room.category || "General"}</p>
                                        </div>
                                        <Badge variant="secondary">{member.role}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No groups found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
