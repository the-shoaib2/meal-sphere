import { NextRequest, NextResponse } from "next/server"
import { getUserPasskeys } from "@/lib/services/passkey-service"
import { prisma } from "@/lib/services/prisma"

async function getSimpleWebAuthn() {
  try {
    return await import("@simplewebauthn/server")
  } catch {
    return null
  }
}

async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
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
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const passkeys = await getUserPasskeys(user.id)
    if (passkeys.length === 0) {
      return NextResponse.json({ error: "No passkeys registered for this account" }, { status: 404 })
    }

    const rpID = process.env.WEBAUTHN_RP_ID ?? new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").hostname

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: passkeys.map((pk) => ({
        id: pk.credentialID,
        transports: (pk.transports?.split(",") ?? []) as any,
      })),
    })

    const response = NextResponse.json({ ...options, userId: user.id })
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
