"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Fingerprint, Trash2, Plus, Loader2, KeyRound, ShieldCheck } from "lucide-react"
import { toast } from "react-hot-toast"

interface Passkey {
    id: string
    name: string
    createdAt: string
    credentialDeviceType: string
    credentialBackedUp: boolean
}

export function PasskeyManagement() {
    const [passkeys, setPasskeys] = useState<Passkey[]>([])
    const [isRegistering, setIsRegistering] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadPasskeys = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/passkey/list")
            if (res.ok) {
                const data = await res.json()
                setPasskeys(data)
            }
        } catch {
            // silent
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadPasskeys()
    }, [loadPasskeys])

    const handleRegister = async () => {
        if (typeof window === "undefined" || !window.PublicKeyCredential) {
            toast.error("Your device or browser doesn't support passkeys.")
            return
        }

        setIsRegistering(true)
        const toastId = toast.loading("Starting passkey registration…")

        try {
            // Step 1: Get registration options from server
            const optionsRes = await fetch("/api/auth/passkey/register-options", { method: "POST" })
            if (!optionsRes.ok) {
                const err = await optionsRes.json()
                throw new Error(err.error ?? "Failed to get registration options")
            }
            const options = await optionsRes.json()

            // Step 2: Dynamically import browser SDK and create credential
            // NOTE: v9 API takes options directly, not { optionsJSON: options } (that's v10+)
            const { startRegistration } = await import("@simplewebauthn/browser")
            toast.loading("Follow your device's prompt to register…", { id: toastId })

            const credential = await startRegistration(options)

            // Step 3: Verify with server
            toast.loading("Verifying passkey…", { id: toastId })
            const verifyRes = await fetch("/api/auth/passkey/register-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credential),
            })

            if (!verifyRes.ok) {
                const err = await verifyRes.json()
                throw new Error(err.error ?? "Verification failed")
            }

            toast.success("Passkey registered successfully!", { id: toastId })
            await loadPasskeys()
        } catch (error: any) {
            if (error?.name === "NotAllowedError") {
                toast.error("Registration was cancelled.", { id: toastId })
            } else {
                toast.error(error?.message ?? "Failed to register passkey.", { id: toastId })
            }
        } finally {
            setIsRegistering(false)
        }
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        try {
            const res = await fetch("/api/auth/passkey/list", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credentialID: id }),
            })

            if (!res.ok) throw new Error("Failed to delete passkey")
            setPasskeys((prev) => prev.filter((p) => p.id !== id))
            toast.success("Passkey removed")
        } catch {
            toast.error("Failed to remove passkey. Please try again.")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <CardTitle>Passkeys</CardTitle>
                </div>
                <CardDescription>
                    Sign in securely using your device&apos;s biometrics or screen lock — no password needed.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : passkeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
                        <Fingerprint className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">No passkeys registered</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Add a passkey to sign in faster and more securely.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {passkeys.map((passkey) => (
                            <div
                                key={passkey.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="h-4 w-4 text-primary shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">{passkey.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {passkey.credentialBackedUp && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <ShieldCheck className="h-3 w-3 text-green-500" /> Synced
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">Active</Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        disabled={deletingId === passkey.id}
                                        onClick={() => handleDelete(passkey.id)}
                                    >
                                        {deletingId === passkey.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Separator />

                <Button
                    onClick={handleRegister}
                    disabled={isRegistering || isLoading}
                    className="w-full"
                >
                    {isRegistering ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering…
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            Register New Passkey
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
