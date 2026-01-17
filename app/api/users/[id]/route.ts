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
                                },
                            },
                        },
                    },
                },
            })
        ])

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error("[USER_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
