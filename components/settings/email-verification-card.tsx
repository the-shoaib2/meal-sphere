"use client"

import { useState } from "react"
import type { User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

interface EmailVerificationCardProps {
    user: User
}

export function EmailVerificationCard({ user }: EmailVerificationCardProps) {
    const [isVerifying, setIsVerifying] = useState(false)

    async function sendVerificationEmail() {
        setIsVerifying(true)

        try {
            const response = await fetch("/api/user/verify-email", {
                method: "POST",
            })

            if (!response.ok) {
                throw new Error("Failed to send verification email")
            }

            toast.success("Verification email sent successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to send verification email")
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Email Verification</CardTitle>
                <CardDescription className="text-sm">Verify your email address to secure your account</CardDescription>
            </CardHeader>
            <CardContent>
                {user.emailVerified ? (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Email Verified</AlertTitle>
                        <AlertDescription className="text-green-700">
                            Your email has been verified on {new Date(user.emailVerified).toLocaleDateString()}.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Email Not Verified</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                Please verify your email address to secure your account.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={sendVerificationEmail} disabled={isVerifying} >
                            {isVerifying ? "Sending..." : "Send Verification Email"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
