import { prisma } from "@/lib/services/prisma"

// --- Types ---
export interface StoredPasskey {
  credentialID: string
  credentialPublicKey: string
  counter: bigint
  credentialDeviceType: string
  credentialBackedUp: boolean
  transports: string | null
  name: string | null
  userId: string
}

// --- Storage helpers ---

export async function getUserPasskeys(userId: string): Promise<StoredPasskey[]> {
  return prisma.authenticator.findMany({
    where: { userId },
  })
}

export async function getPasskeyById(credentialID: string): Promise<StoredPasskey | null> {
  return prisma.authenticator.findUnique({
    where: { credentialID },
  })
}

export async function saveNewPasskey(
  userId: string,
  passkey: {
    credentialID: string
    credentialPublicKey: string
    counter: bigint
    credentialDeviceType: string
    credentialBackedUp: boolean
    transports?: string[]
    name?: string
  }
): Promise<void> {
  await prisma.authenticator.create({
    data: {
      userId,
      credentialID: passkey.credentialID,
      providerAccountId: passkey.credentialID,
      credentialPublicKey: passkey.credentialPublicKey,
      counter: passkey.counter,
      credentialDeviceType: passkey.credentialDeviceType,
      credentialBackedUp: passkey.credentialBackedUp,
      transports: passkey.transports?.join(","),
      name: passkey.name,
    },
  })
}

export async function updatePasskeyCounter(credentialID: string, newCounter: bigint): Promise<void> {
  await prisma.authenticator.update({
    where: { credentialID },
    data: { counter: newCounter },
  })
}

export async function deletePasskey(credentialID: string, userId: string): Promise<void> {
  await prisma.authenticator.delete({
    where: { credentialID, userId },
  })
}
