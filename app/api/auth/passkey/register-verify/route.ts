import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { saveNewPasskey } from "@/lib/services/passkey-service"

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

    const { verifyRegistrationResponse } = lib

    // Retrieve the challenge stored in the cookie
    const expectedChallenge = req.cookies.get("passkey_challenge")?.value
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Challenge expired or missing. Please try again." }, { status: 400 })
    }

    const rpID = process.env.WEBAUTHN_RP_ID ?? new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").hostname
    const body = await req.json()

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: process.env.NEXTAUTH_URL ?? `http://localhost:3000`,
      expectedRPID: rpID,
      requireUserVerification: false, // matches userVerification: "preferred" in register-options
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 })
    }

    // v9 API: fields are directly on registrationInfo (no nested `credential` object)
    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo

    // Save the new passkey to the database
    await saveNewPasskey(session.user.id, {
      credentialID: Buffer.from(credentialID).toString("base64url"),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter: BigInt(counter),
      credentialDeviceType,
      credentialBackedUp,
      transports: body.response?.transports ?? [],
      name: body.name,
    })

    // Clear the challenge cookie
    const response = NextResponse.json({ verified: true, credentialID: Buffer.from(credentialID).toString("base64url") })
    response.cookies.delete("passkey_challenge")
    return response
  } catch (error) {
    console.error("[passkey/register-verify]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
