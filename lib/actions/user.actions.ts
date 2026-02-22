"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createVerificationToken, sendVerificationEmail } from "@/lib/services/email-utils";

// --- VALIDATION SCHEMAS ---
const checkExistsSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const languageSchema = z.object({
  language: z.enum(["en", "bn"]),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  image: z.string().optional(),
});

// --- ACTIONS ---

export async function checkUserExistsOriginal(email?: string, phone?: string) {
  const validated = checkExistsSchema.safeParse({ email, phone });
  if (!validated.success) {
    return { success: false, error: "Invalid input", details: validated.error.format() };
  }

  const data = validated.data;
  let exists = false;
  let field = null;

  if (data.email) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (user) {
      exists = true;
      field = "email";
    }
  }

  return { exists, field };
}

export async function updateUserLanguage(language: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" };
    }

    const validatedData = languageSchema.parse({ language });

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { language: validatedData.language },
    });

    return { success: true, message: "Language updated successfully", language: updatedUser.language };
  } catch (error) {
    console.error("Error updating language:", error);
    return { success: false, message: "Failed to update language" };
  }
}

export async function updateUserPassword(data: z.infer<typeof passwordSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" };
    }

    const validatedData = passwordSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.password) {
      return { success: false, message: "User not found or no password set" };
    }

    const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, message: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await prisma.user.update({
      where: { email: session.user.email },
      data: { password: hashedPassword },
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error: any) {
    console.error("Error updating password:", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: (error as any).errors[0].message };
    }
    return { success: false, message: "Failed to update password" };
  }
}

export async function updateUserProfile(data: z.infer<typeof profileSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" };
    }

    const validatedData = profileSchema.parse(data);

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return { success: false, message: "User not found" };
    }

    const emailChanged = currentUser.email !== validatedData.email;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        image: validatedData.image,
        emailVerified: emailChanged ? null : currentUser.emailVerified,
      },
    });

    return { 
      success: true, 
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
      }
    };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    if (error instanceof z.ZodError) {
        return { success: false, message: (error as any).errors[0].message };
    }
    return { success: false, message: "Failed to update profile" };
  }
}

export async function sendUserVerificationEmail() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.emailVerified) {
      return { success: false, message: "Email already verified" };
    }

    const token = await createVerificationToken(user.email);
    await sendVerificationEmail(user.email, user.name, token);

    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, message: "Failed to send verification email" };
  }
}
