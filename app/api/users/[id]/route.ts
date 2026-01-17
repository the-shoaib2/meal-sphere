import { NextResponse } from "next/server"
import { prisma } from "@/lib/services/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const [session, user] = await Promise.all([
            getServerSession(authOptions),
            prisma.user.findUnique({
                where: {
                    id: id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    createdAt: true,
                    showEmail: true,
                    profileVisibility: true,
                    rooms: {
                        select: {
                            role: true,
                            room: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    category: true,
                                    memberCount: true,
                                    isPrivate: true,
                                },
                            },
                        },
                    },
                },
            })
        ])

        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        // Privacy Checks
        const isSelf = session.user.email === user.email;
        
        // 1. Profile Visibility
        if (!isSelf && user.profileVisibility === 'PRIVATE') {
             // For private profiles, maybe return limited info or 404/403. 
             // Let's return minimal info.
             return NextResponse.json({
                 id: user.id,
                 name: user.name,
                 image: user.image,
                 isPrivate: true
             })
        }

        // 2. Email Privacy
        const email = (isSelf || user.showEmail) ? user.email : null;

        // 3. Room Privacy
        // Filter out private rooms from the list unless it's the user themselves viewing it
        const visibleRooms = user.rooms.filter(membership => {
            if (isSelf) return true;
            return !membership.room.isPrivate; 
        }).map(membership => ({
            role: membership.role,
            room: membership.room
        }));

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: email,
            image: user.image,
            createdAt: user.createdAt,
            rooms: visibleRooms,
            profileVisibility: user.profileVisibility
        })
    } catch (error) {
        console.error("[USER_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
