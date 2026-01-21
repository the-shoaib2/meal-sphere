import { prisma } from '@/lib/services/prisma';
import * as bcrypt from 'bcryptjs';
import { createVerificationToken, sendVerificationEmail, sendPasswordResetEmail } from '@/lib/services/email-utils';
import getRedisClient from '@/lib/services/redis';
import { createHash } from 'crypto';
import { revokeMultipleSessions, revokeAllSessions, getAllActiveSessions, updateSessionInfo, getCurrentSessionInfo } from '@/lib/auth/session-manager';
import { getLocationFromIP } from '@/lib/utils/location-utils';

// Re-export session manager functions for unified access
export { revokeMultipleSessions, revokeAllSessions, getAllActiveSessions, updateSessionInfo, getCurrentSessionInfo };

export type RegisterUserData = {
  name: string;
  email: string;
  password: string;
  captchaSessionId: string;
  captchaText: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function registerUser(data: RegisterUserData) {
  const redis = getRedisClient();
  if (!redis) {
     throw new Error("Service unavailable");
  }

  // Verify CAPTCHA
  const validCaptchaText = await redis.get(`captcha:${data.captchaSessionId}`);
  
  if (!validCaptchaText) {
     throw new Error("CAPTCHA expired or invalid. Please refresh.");
  }
  
  const isValidCaptcha = data.captchaText.toUpperCase() === validCaptchaText.toUpperCase();

  if (!isValidCaptcha) {
    throw new Error("Incorrect CAPTCHA text");
  }
  
  // Invalidate CAPTCHA after use
  await redis.del(`captcha:${data.captchaSessionId}`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      language: "en",
      isActive: true,
    }
  });

  // Create verification token
  const token = await createVerificationToken(data.email);

  // Send verification email
  try {
    await sendVerificationEmail(data.email, data.name, token);
  } catch (emailError) {
    console.error("Failed to send verification email:", emailError);
    // Don't throw, allow registration to complete
  }

  return { success: true, userId: user.id };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Security: Always return success message to prevent enumeration
  const successMessage = "If an account exists with this email, you will receive a password reset link.";

  if (!user) {
    return { message: successMessage };
  }

  if (!user.password) {
     throw new Error("This account uses a social login provider. Please sign in with that provider.");
  }

  // 5 minutes expiry
  const token = await createVerificationToken(email, 5 * 60 * 1000);
  await sendPasswordResetEmail(email, user.name || "User", token);

  return { message: successMessage };
}

export async function resetPassword(token: string, email: string, password: string) {
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.verificationToken.findFirst({
        where: {
            identifier: email,
            token: hashedToken,
        }
    });

    if (!verificationToken) {
        throw new Error("Invalid or expired token");
    }

    const hasExpired = new Date() > verificationToken.expires;

    if (hasExpired) {
        // Cleanup expired token
        await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
        throw new Error("Token has expired. Please request a new one.");
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

    return { success: true, message: "Password reset successfully" };
}

/**
 * Helper to enrich session data with location
 */
export async function enrichSession(sessionToken: string, userAgent: string, ipAddress: string, userId: string) {
    try {
        let locationData = {};
        if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== 'localhost' && ipAddress !== '::1') {
           locationData = await getLocationFromIP(ipAddress);
        } else if (ipAddress) {
           locationData = {
              city: 'Localhost',
              country: 'Development',
              latitude: null,
              longitude: null
           };
        }

        await updateSessionInfo(
           sessionToken,
           userAgent,
           ipAddress,
           userId,
           locationData
        );
    } catch (e) {
        console.error("Failed to enrich session:", e);
    }
}
