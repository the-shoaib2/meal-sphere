import { NextRequest, NextResponse } from "next/server"
import { getPasskeyById, updatePasskeyCounter } from "@/lib/services/passkey-service"
import { prisma } from "@/lib/services/prisma"

async function getSimpleWebAuthn() {
  try {
    return await import("@simplewebauthn/server")
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const lib = await getSimpleWebAuthn()
    if (!lib) {
      return NextResponse.json({ error: "WebAuthn library not installed" }, { status: 500 })
    }

    const { verifyAuthenticationResponse } = lib

    const expectedChallenge = req.cookies.get("passkey_challenge")?.value
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 })
    }

    const body = await req.json()
    // Find the passkey
    const passkey = await getPasskeyById(body.id)
    if (!passkey) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 })
    }

    const { userId } = passkey

    const rpID = process.env.WEBAUTHN_RP_ID ?? new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").hostname

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: process.env.NEXTAUTH_URL ?? `http://localhost:3000`,
      expectedRPID: rpID,
      requireUserVerification: false,
      authenticator: {
        credentialID: Buffer.from(passkey.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(passkey.credentialPublicKey, "base64"),
        counter: Number(passkey.counter),
        transports: (passkey.transports?.split(",") ?? []) as any,
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 400 })
    }

    // Update the counter to prevent replay attacks
    await updatePasskeyCounter(passkey.credentialID, BigInt(verification.authenticationInfo.newCounter))

    // Fetch the user for token creation
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return a success token – the frontend will use next-auth signIn("credentials") after this
    const response = NextResponse.json({
      verified: true,
      userId: user.id,
      email: user.email,
    })
    response.cookies.delete("passkey_challenge")
    return response
  } catch (error) {
    console.error("[passkey/authenticate-verify]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
