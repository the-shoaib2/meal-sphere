"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Utensils, Loader2, KeyRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"
import { toast } from "react-hot-toast"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error parameters
  const error = searchParams?.get('error')

  // Show error message if session expired
  useEffect(() => {
    if (error === 'session_expired') {
      toast.error('Your session has expired. Please sign in again.')
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    const toastId = toast.loading('Signing in...')

    try {
      const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl
      })

      if (!result) {
        throw new Error('No response from server')
      }

      if (result.error) {
        toast.error('Invalid email or password', { id: toastId })
        return
      }

      // If we get here, login was successful
      toast.success('Login successful!', { id: toastId })

      // Use router.push for proper navigation
      router.push(callbackUrl)

    } catch (error) {
      toast.error('An error occurred. Please try again.', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

      // For OAuth providers, we should use redirect: true to let NextAuth handle the flow
      await signIn("google", {
        callbackUrl,
        redirect: true
      })

    } catch (error) {
      toast.error("Failed to sign in with Google")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handlePasskeySignIn = async () => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast.error("Passkeys are not supported on this device/browser.")
      return
    }

    setIsPasskeyLoading(true)
    const toastId = toast.loading("Authenticating with passkey…")

    try {
      // Step 1: Get authentication options
      const optionsRes = await fetch("/api/auth/passkey/authenticate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }), // Options: can be empty for passwordless or with email
      })

      if (!optionsRes.ok) {
        const err = await optionsRes.json()
        throw new Error(err.error ?? "Failed to get authentication options")
      }

      const options = await optionsRes.json()

      // Step 2: Use browser SDK to start authentication
      const { startAuthentication } = await import("@simplewebauthn/browser")
      const authResponse = await startAuthentication(options)

      // Step 3: Verify with server
      const verifyRes = await fetch("/api/auth/passkey/authenticate-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResponse),
      })

      if (!verifyRes.ok) {
        const err = await verifyRes.json()
        throw new Error(err.error ?? "Authentication verification failed")
      }

      const verifyData = await verifyRes.json()

      if (verifyData.verified) {
        // Step 4: Sign in with the token received from server
        // We'll use a custom 'passkey' provider or a special case in credentials
        // Actually, we can use the same sign-in flow if the server returns a session or we can trigger it
        const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

        // Use NextAuth's signIn with the authenticated passkey data
        // We need to ensure the passkey provider is configured in auth.ts
        const loginResult = await signIn("credentials", {
          passkey: true,
          credentialID: verifyData.credentialID,
          userId: verifyData.userId,
          redirect: false,
          callbackUrl,
        })

        if (loginResult?.error) {
          throw new Error(loginResult.error)
        }

        toast.success("Passkey login successful!", { id: toastId })
        router.push(callbackUrl)
      } else {
        throw new Error("Verification failed")
      }
    } catch (error: any) {
      if (error?.name === "NotAllowedError") {
        toast.error("Authentication was cancelled.", { id: toastId })
      } else {
        toast.error(error?.message ?? "Passkey login failed.", { id: toastId })
      }
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 dark:bg-gray-900">
      <div className="mb-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Utensils className="h-6 w-6" />
          <span className="text-xl">MealSphere</span>
        </Link>
      </div>

      <Card className="w-full max-w-[400px]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-bold text-center">Sign in to your account</CardTitle>
          <CardDescription className="text-center text-xs">
            Enter your email and password to access your account
          </CardDescription>

          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              className="w-full"
              disabled={isGoogleLoading || isPasskeyLoading}
              onClick={handleGoogleSignIn}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Google</span>
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Google
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              disabled={isPasskeyLoading || isGoogleLoading}
              onClick={handlePasskeySignIn}
            >
              {isPasskeyLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Passkey</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="mr-2 h-4 w-4" id="Passkey--Streamline-Outlined-Material">
                    <path fill="currentColor" d="M3 20v-2.35c0 -0.63335 0.158335 -1.175 0.475 -1.625 0.316665 -0.45 0.725 -0.79165 1.225 -1.025 1.11665 -0.5 2.1875 -0.875 3.2125 -1.125S9.96665 13.5 11 13.5c0.43335 0 0.85415 0.02085 1.2625 0.0625s0.82915 0.10415 1.2625 0.1875c-0.08335 0.96665 0.09585 1.87915 0.5375 2.7375C14.50415 17.34585 15.15 18.01665 16 18.5v1.5H3Zm16 3.675 -1.5 -1.5v-4.65c-0.73335 -0.21665 -1.33335 -0.62915 -1.8 -1.2375 -0.46665 -0.60835 -0.7 -1.3125 -0.7 -2.1125 0 -0.96665 0.34165 -1.79165 1.025 -2.475 0.68335 -0.68335 1.50835 -1.025 2.475 -1.025s1.79165 0.34165 2.475 1.025c0.68335 0.68335 1.025 1.50835 1.025 2.475 0 0.75 -0.2125 1.41665 -0.6375 2 -0.425 0.58335 -0.9625 1 -1.6125 1.25l1.25 1.25 -1.5 1.5 1.5 1.5 -2 2ZM11 11.5c-1.05 0 -1.9375 -0.3625 -2.6625 -1.0875 -0.725 -0.725 -1.0875 -1.6125 -1.0875 -2.6625s0.3625 -1.9375 1.0875 -2.6625C9.0625 4.3625 9.95 4 11 4s1.9375 0.3625 2.6625 1.0875c0.725 0.725 1.0875 1.6125 1.0875 2.6625s-0.3625 1.9375 -1.0875 2.6625C12.9375 11.1375 12.05 11.5 11 11.5Zm7.5 3.175c0.28335 0 0.52085 -0.09585 0.7125 -0.2875S19.5 13.95835 19.5 13.675c0 -0.28335 -0.09585 -0.52085 -0.2875 -0.7125s-0.42915 -0.2875 -0.7125 -0.2875c-0.28335 0 -0.52085 0.09585 -0.7125 0.2875S17.5 13.39165 17.5 13.675c0 0.28335 0.09585 0.52085 0.2875 0.7125s0.42915 0.2875 0.7125 0.2875Z" strokeWidth="0.5"></path>
                  </svg>
                  Passkey
                </>
              )}
            </Button>
          </div>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
