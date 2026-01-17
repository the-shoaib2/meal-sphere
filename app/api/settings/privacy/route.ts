
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/services/prisma"
import { z } from "zod"

const privacySchema = z.object({
  isSearchable: z.boolean(),
  showEmail: z.boolean(),
  profileVisibility: z.enum(["PUBLIC", "AUTHENTICATED", "PRIVATE"]),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { isSearchable, showEmail, profileVisibility } = privacySchema.parse(body)

    const user = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        isSearchable,
        showEmail,
        profileVisibility,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[PRIVACY_SETTINGS_ERROR]", error)
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}
