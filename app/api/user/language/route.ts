import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const languageSchema = z.object({
  language: z.enum(["en", "bn"]),
})

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = languageSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        language: validatedData.language,
      },
    })

    return NextResponse.json({
      message: "Language updated successfully",
      language: updatedUser.language,
    })
  } catch (error) {
    console.error("Error updating language:", error)
    return NextResponse.json({ message: "Failed to update language" }, { status: 500 })
  }
}
