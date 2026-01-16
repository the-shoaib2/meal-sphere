
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Utensils, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "react-hot-toast"

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const searchParams = useSearchParams()
    const router = useRouter()

    const token = searchParams?.get("token")
    const email = searchParams?.get("email")

    useEffect(() => {
        if (!token || !email) {
            toast.error("Invalid or missing reset token")
        }
    }, [token, email])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!token || !email) {
            toast.error("Invalid reset link. Please request a new one.")
            return
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    email,
                    password
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Failed to reset password")
            }

            toast.success("Password reset successfully!")

            // Redirect to login after delay
            setTimeout(() => {
                router.push("/login")
            }, 2000)

        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 dark:bg-gray-900">
            <div className="mb-8">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Utensils className="h-6 w-6" />
                    <span className="text-xl">MealSphere</span>
                </Link>
            </div>

            <Card className="w-full max-w-[400px]">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                    <CardDescription className="text-center">
                        Create a new password for your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading || !token || !email}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
