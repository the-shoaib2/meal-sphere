import { NextRequest, NextResponse } from "next/server"
import { getUserPasskeys } from "@/lib/services/passkey-service"
import { prisma } from "@/lib/services/prisma"

// Version 1.0.1 - Forced Refresh
async function getSimpleWebAuthn() {
  try {
    return await import("@simplewebauthn/server")
  } catch {
    return null
  }
}

async function getUserByEmail(email: string) {
  const user = await prisma.user.findFirst({
    where: { 
      email: {
        equals: email,
        mode: 'insensitive'
      }
    },
    select: { id: true, email: true },
  })
  return user
}

export async function POST(req: NextRequest) {
  try {
    const lib = await getSimpleWebAuthn()
    if (!lib) {
      return NextResponse.json({ error: "WebAuthn library not installed" }, { status: 500 })
    }

    const { generateAuthenticationOptions } = lib
    // Renamed to move away from any potential collisions
    const appRpID = process.env.WEBAUTHN_RP_ID ?? new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").hostname
    const { email } = await req.json()

    let user = null
    if (email) {
      user = await getUserByEmail(email)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
    }

    const passkeys = user ? await getUserPasskeys(user.id) : []
    
    const options = await generateAuthenticationOptions({
      rpID: appRpID,
      userVerification: "preferred",
      allowCredentials: passkeys.map((pk) => ({
        id: Buffer.from(pk.credentialID, 'base64url'),
        type: 'public-key' as const,
        transports: (pk.transports?.split(",") ?? []) as any,
      })),
    })

    const response = NextResponse.json({ ...options, userId: user?.id || null })
    response.cookies.set("passkey_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    })

    return response
  } catch (error) {
    console.error("[passkey/authenticate-options]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
