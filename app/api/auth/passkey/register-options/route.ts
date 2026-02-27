import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { getUserPasskeys } from "@/lib/services/passkey-service"

async function getSimpleWebAuthn() {
  try {
    return await import("@simplewebauthn/server")
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lib = await getSimpleWebAuthn()
    if (!lib) {
      return NextResponse.json({ error: "WebAuthn library not installed" }, { status: 500 })
    }

    const { generateRegistrationOptions } = lib
    const userId = session.user.id
    const userName = session.user.name ?? session.user.email ?? "User"
    const userEmail = session.user.email ?? userId

    // Fetch existing passkeys to exclude them from new registration
    const existingPasskeys = await getUserPasskeys(userId)

    // v9 flat API: userName, userDisplayName (userID is auto-generated as random Uint8Array)
    const options = await generateRegistrationOptions({
      rpName: "MealSphere",
      rpID: process.env.WEBAUTHN_RP_ID ?? new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").hostname,
      userName: userEmail,
      userDisplayName: userName,
      // v9 types declare userID as string
      userID: userId,
      attestationType: "none",
      excludeCredentials: existingPasskeys.map((pk: any) => ({
        id: pk.credentialID,
        type: "public-key" as const,
        transports: (pk.transports?.split(",") ?? []) as any,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    })

    // Store the challenge in an httpOnly cookie so the verify endpoint can check it
    const response = NextResponse.json(options)
    response.cookies.set("passkey_challenge", options.challenge as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300, // 5 minutes
    })

    return response
  } catch (error) {
    console.error("[passkey/register-options]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
