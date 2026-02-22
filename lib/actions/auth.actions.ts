"use server"

import { prisma } from "@/lib/services/prisma"
import { createVerificationToken, sendVerificationEmail } from "@/lib/services/email-utils"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import { BCRYPT_ROUNDS } from "@/lib/constants/security"
import getRedisClient from '@/lib/services/redis'
import { headers } from "next/headers"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  captchaSessionId: z.string().min(1, 'CAPTCHA session ID is required'),
  captchaText: z.string().min(1, 'CAPTCHA text is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export async function registerUserAction(data: z.infer<typeof registerSchema>) {
  try {
    const validatedData = registerSchema.parse(data)

    const redis = getRedisClient()
    if (!redis) {
      return { success: false, message: "Service unavailable (Redis down)" }
    }

    // Verify CAPTCHA
    const validCaptchaText = await redis.get(`captcha:${validatedData.captchaSessionId}`)
    
    if (!validCaptchaText) {
      return { 
        success: false, 
        message: "CAPTCHA expired or invalid. Please refresh.",
        details: { captcha: { _errors: ["CAPTCHA expired or invalid. Please refresh."] } }
      }
    }
    
    const isValidCaptcha = validatedData.captchaText.toUpperCase() === validCaptchaText.toUpperCase()

    if (!isValidCaptcha) {
      return { 
        success: false, 
        message: "Incorrect CAPTCHA text",
        details: { captcha: { _errors: ["Incorrect CAPTCHA text"] } }
      }
    }
    
    // Invalidate CAPTCHA after use
    await redis.del(`captcha:${validatedData.captchaSessionId}`)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return { 
        success: false, 
        message: "User already exists",
        details: { email: { _errors: ["User with this email already exists"] } }
      }
    }

    // Hash password with consistent rounds
    const hashedPassword = await bcrypt.hash(validatedData.password, BCRYPT_ROUNDS)

    // Extract client info for session tracking securely in server action
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
                      headersList.get('x-real-ip') || 
                      'unknown'

    // Create user without initial session (session will be created on first login)
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        language: "en",
        isActive: true,
      }
    })

    // Create verification token
    const token = await createVerificationToken(validatedData.email)

    // Send verification email (non-blocking)
    try {
      await sendVerificationEmail(validatedData.email, validatedData.name, token)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      // Continue with successful registration response even if email fails
    }

    return { success: true, message: "User registered successfully" }

  } catch (error) {
    console.error("Registration action error:", error)
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        message: "Invalid input data", 
        details: error.format() 
      }
    }
    return { success: false, message: "Failed to register user" }
  }
}
