import { createHash, randomBytes } from "crypto"
import { prisma } from "./prisma"
import nodemailer from "nodemailer"

// Email configuration type
type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Email template type
type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
}

// Base email template with common styles
const baseTemplate = (content: string) => `
  <div style="
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  ">
    <div style="
      text-align: center;
      margin-bottom: 30px;
    ">
      <h1 style="
        color: #333;
        margin: 0;
        font-size: 24px;
      ">MealSphere</h1>
    </div>
    ${content}
    <div style="
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #666;
      font-size: 12px;
    ">
      <p>This is an automated message, please do not reply.</p>
      <p>&copy; ${new Date().getFullYear()} MealSphere. All rights reserved.</p>
    </div>
  </div>
`

// Button component
const buttonTemplate = (text: string, url: string) => `
  <div style="text-align: center; margin: 30px 0;">
    <a href="${url}" style="
      background-color: #4CAF50;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      display: inline-block;
      font-weight: bold;
    ">${text}</a>
  </div>
`

// Email templates
const emailTemplates = {
  verification: (name: string, verificationUrl: string): EmailTemplate => ({
    subject: "Verify your email address",
    text: `Hello ${name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThe link will expire in 24 hours.\n\nIf you did not request this email, please ignore it.\n\nRegards,\nMealSphere Group`,
    html: baseTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Verify your email address</h2>
      <p>Hello ${name},</p>
      <p>Please verify your email address by clicking the button below:</p>
      ${buttonTemplate("Verify Email", verificationUrl)}
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
      <p>The link will expire in 24 hours.</p>
      <p>If you did not request this email, please ignore it.</p>
    `)
  }),

  passwordReset: (name: string, resetUrl: string): EmailTemplate => ({
    subject: "Reset your password",
    text: `Hello ${name},\n\nYou requested to reset your password. Click the link below to set a new password:\n\n${resetUrl}\n\nThe link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nRegards,\nMealSphere Group`,
    html: baseTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Reset your password</h2>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      ${buttonTemplate("Reset Password", resetUrl)}
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
      <p>The link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `)
  }),

  welcome: (name: string): EmailTemplate => ({
    subject: "Welcome to MealSphere!",
    text: `Hello ${name},\n\nWelcome to MealSphere! We're excited to have you on board.\n\nGet started by exploring our features and connecting with other members.\n\nRegards,\nMealSphere Team`,
    html: baseTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">Welcome to MealSphere!</h2>
      <p>Hello ${name},</p>
      <p>We're excited to have you join our community! Here's what you can do next:</p>
      <ul style="color: #666; line-height: 1.6;">
        <li>Complete your profile</li>
        <li>Join or create a room</li>
        <li>Start managing your meals</li>
      </ul>
      ${buttonTemplate("Get Started", `${process.env.NEXTAUTH_URL}/dashboard`)}
    `)
  }),

  groupInvite: (name: string, groupName: string, inviteUrl: string, role: string): EmailTemplate => ({
    subject: `You've been invited to join ${groupName} on MealSphere`,
    text: `Hello ${name},\n\nYou've been invited to join ${groupName} on MealSphere as a ${role}.\n\nClick the link below to accept the invitation:\n\n${inviteUrl}\n\nThe link will expire in 7 days.\n\nRegards,\nMealSphere Team`,
    html: baseTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">You've been invited to join ${groupName}</h2>
      <p>Hello ${name},</p>
      <p>You've been invited to join <strong>${groupName}</strong> on MealSphere as a <strong>${role}</strong>.</p>
      <p>Click the button below to accept the invitation:</p>
      ${buttonTemplate("Join Group", inviteUrl)}
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
      <p>The link will expire in 7 days.</p>
    `)
  })
}

// Get email configuration from environment variables
export function getEmailConfig(): EmailConfig {
  const requiredVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  return {
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT!),
    secure: process.env.NODE_ENV === 'production',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    from: process.env.SMTP_FROM!,
  }
}

// Send email function
export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  try {
    const config = getEmailConfig()
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    })

    // Verify transporter configuration
    await transporter.verify()

    // Send the email
    await transporter.sendMail({
      from: config.from,
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
    throw new Error('Failed to send email. Please try again later.')
  }
}

// Create a verification token
export async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const hashedToken = createHash("sha256").update(token).digest("hex")
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  })

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
  const template = emailTemplates.verification(name, verificationUrl)
  await sendEmail(email, template)
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  const template = emailTemplates.passwordReset(name, resetUrl)
  await sendEmail(email, template)
}

// Send welcome email
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const template = emailTemplates.welcome(name)
  await sendEmail(email, template)
}

// Verify email with token
export async function verifyEmail(email: string, token: string): Promise<boolean> {
  try {
    const hashedToken = createHash("sha256").update(token).digest("hex")
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

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
      },
    })

    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    })

    return true
  } catch (error) {
    console.error('Failed to verify email:', error)
    throw new Error('Failed to verify email. Please try again later.')
  }
}

// Send group invitation email
export async function sendGroupInviteEmail(
  email: string, 
  name: string, 
  groupName: string, 
  inviteUrl: string,
  role: string
): Promise<void> {
  const template = emailTemplates.groupInvite(name, groupName, inviteUrl, role)
  await sendEmail(email, template)
}
