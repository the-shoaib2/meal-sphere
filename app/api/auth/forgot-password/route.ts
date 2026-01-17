
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/services/prisma"
import { createVerificationToken, sendPasswordResetEmail } from "@/lib/services/email-utils"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json(
        { message: "If an account exists with this email, you will receive a password reset link." },
        { status: 200 }
      );
    }

    if (!user.password) {
       // User logged in with Google/OAuth presumably, no password to reset
        return NextResponse.json(
        { message: "This account uses a social login provider. Please sign in with that provider." },
        { status: 400 }
      );
    }

    // 5 minutes expiry = 5 * 60 * 1000 ms
    const token = await createVerificationToken(email, 5 * 60 * 1000);
    await sendPasswordResetEmail(email, user.name || "User", token);

    return NextResponse.json(
      { message: "If an account exists with this email, you will receive a password reset link." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
