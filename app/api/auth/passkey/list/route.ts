import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { getUserPasskeys, deletePasskey } from "@/lib/services/passkey-service"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const passkeys = await getUserPasskeys(session.user.id)
  return NextResponse.json(
    passkeys.map((pk: any) => ({
      id: pk.credentialID,
      name: `Passkey (${pk.credentialDeviceType ?? "device"})`,
      createdAt: pk.createdAt?.toISOString() ?? new Date().toISOString(),
      credentialDeviceType: pk.credentialDeviceType,
      credentialBackedUp: pk.credentialBackedUp,
    }))
  )
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { credentialID } = await req.json()
  if (!credentialID) {
    return NextResponse.json({ error: "credentialID is required" }, { status: 400 })
  }

  await deletePasskey(credentialID, session.user.id)
  return NextResponse.json({ success: true })
}
