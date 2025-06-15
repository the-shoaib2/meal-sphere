import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"
import { createVerificationToken } from "@/lib/email-utils"
import { sendVerificationEmail } from "@/lib/email-utils"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import { validateCaptcha } from '@/lib/auth/captcha'

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
  captchaSessionId: z.string().min(1, 'CAPTCHA session ID is required'),
  captchaText: z.string().min(1, 'CAPTCHA text is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = registerSchema.parse(body);

    // Validate CAPTCHA
    const isValidCaptcha = await validateCaptcha(
      validatedData.captchaSessionId,
      validatedData.captchaText
    );
    if (!isValidCaptcha) {
      return NextResponse.json(
        { message: "Invalid CAPTCHA" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "MEMBER",
      },
    });

    // Create verification token
    const token = await createVerificationToken(validatedData.email);

    // Send verification email
    await sendVerificationEmail(validatedData.email, validatedData.name, token);

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to register user" },
      { status: 500 }
    );
  }
}
