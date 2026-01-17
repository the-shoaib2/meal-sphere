
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/services/prisma"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import { createHash } from "crypto"

const resetPasswordSchema = z.object({
  token: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email, password } = resetPasswordSchema.parse(body);

    const hashedToken = createHash("sha256").update(token).digest("hex")

    const verificationToken = await prisma.verificationToken.findFirst({
        where: {
            identifier: email,
            token: hashedToken,
        }
    });

    if (!verificationToken) {
        return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    const hasExpired = new Date() > verificationToken.expires;

    if (hasExpired) {
        // Cleanup expired token
        await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
        return NextResponse.json({ message: "Token has expired. Please request a new one." }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user
    await prisma.user.update({
        where: { email },
        data: {
            password: hashedPassword,
        }
    });

    // Delete used token
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
