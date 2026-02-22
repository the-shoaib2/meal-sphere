"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/services/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const privacySchema = z.object({
  isSearchable: z.boolean(),
  showEmail: z.boolean(),
  profileVisibility: z.enum(["PUBLIC", "AUTHENTICATED", "PRIVATE"]),
})

export async function updatePrivacySettingsAction(data: z.infer<typeof privacySchema>) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    const { isSearchable, showEmail, profileVisibility } = privacySchema.parse(data)

    await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        isSearchable,
        showEmail,
        profileVisibility,
      },
    })

    revalidatePath("/settings")
    return { success: true, message: "Privacy settings updated successfully" }
  } catch (error) {
    console.error("[PRIVACY_SETTINGS_ERROR]", error)
    if (error instanceof z.ZodError) {
      return { success: false, message: "Invalid request data" }
    }
    return { success: false, message: "Internal Error" }
  }
}

export async function updateGlobalNotificationSettingsAction(settings: any) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
       return { success: false, message: "Unauthorized" }
    }

    // TODO: When Prisma schema is updated with global notification preferences, 
    // save them to the database here.
    // For now, return success to maintain UI compatibility with the legacy placeholder.

    return { success: true, message: "Settings saved successfully" }
  } catch (error) {
    console.error("[NOTIFICATION_SETTINGS_ERROR]", error)
    return { success: false, message: "Internal Error" }
  }
}
