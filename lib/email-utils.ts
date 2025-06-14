import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

// Create a verification token
export async function createVerificationToken(email: string): Promise<string> {
  // Generate a random token
  const token = randomBytes(32).toString("hex")

  // Hash the token for storage
  const hashedToken = createHash("sha256").update(token).digest("hex")

  // Store the token in the database with an expiry time (24 hours)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  })

  // Create a new token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires,
    },
  })

  return token
}

// Send verification email
export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`

  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    secure: true,
  })

  // Send the email
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your email address",
    text: `Hello ${name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThe link will expire in 24 hours.\n\nIf you did not request this email, please ignore it.\n\nRegards,\nMealSphere Group`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p>Hello ${name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>The link will expire in 24 hours.</p>
        <p>If you did not request this email, please ignore it.</p>
        <p>Regards,<br>MealSphere Group</p>
      </div>
    `,
  })
}

// Verify email with token
export async function verifyEmail(email: string, token: string): Promise<boolean> {
  // Hash the token for comparison
  const hashedToken = createHash("sha256").update(token).digest("hex")

  // Find the token in the database
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      token: hashedToken,
      expires: {
        gt: new Date(),
      },
    },
  })

  if (!verificationToken) {
    return false
  }

  // Mark the email as verified
  await prisma.user.update({
    where: { email },
    data: {
      emailVerified: new Date(),
    },
  })

  // Delete the token
  await prisma.verificationToken.delete({
    where: { id: verificationToken.id },
  })

  return true
}
