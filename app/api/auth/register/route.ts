import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validateCaptcha } from '@/app/api/captcha/route';

const prisma = new PrismaClient();

// Define the request schema
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  captchaSessionId: z.string().min(1, 'CAPTCHA session ID is required'),
  captchaText: z.string().min(1, 'CAPTCHA text is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
}).refine((data) => {
  const validation = validateCaptcha(data.captchaSessionId, data.captchaText);
  return validation.isValid;
}, {
  message: 'Invalid or expired CAPTCHA',
  path: ['captchaText']
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed', 
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;
    
    // CAPTCHA is already validated by the schema, but we'll clean up the session
    // The validation in the schema ensures we only proceed if CAPTCHA is valid

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Registration failed',
          message: 'Email already in use' 
        },
        { status: 400 }
      );
    }


    // Hash the password with a higher salt round for better security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the user with explicit undefined resetToken
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.MEMBER,
        resetToken: undefined // Explicitly set to undefined
      },
    });

    // Don't send back the password hash
    const { password: _, ...userWithoutPassword } = user;

    // Create session token (you might want to use a proper auth library for production)
    const sessionToken = {
      token: 'auth_token_' + Math.random().toString(36).substring(2, 15),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword,
      session: sessionToken,
      isTest: false
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Registration failed',
        message: 'Failed to create user',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
