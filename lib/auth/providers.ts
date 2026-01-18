import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/services/prisma"
import { User } from "next-auth";

// Create Google provider with explicit environment variable access
export const googleProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  httpOptions: {
    timeout: 10000 // Increase timeout to 10 seconds
  },
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code"
    }
  }
});

// Credentials provider for email/password authentication
export const credentialsProvider = CredentialsProvider({
  name: 'credentials',
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Please enter email and password');
    }

    const user = await prisma.user.findUnique({
      where: { email: credentials.email as string },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true
      }
    }) as (User & { password: string | null }) | null;

    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password as string,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Progressive Password Migration
    // If we encounter an old cost-12 hash, re-hash it to cost-10 and update in background.
    // This ensures active users automatically get faster future logins.
    if (user.password.includes('$12$')) {
        bcrypt.hash(credentials.password as string, 10).then(newHash => {
            prisma.user.update({
                where: { id: user.id },
                data: { password: newHash }
            }).catch(() => {
                // Ignore update errors
            });
        });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image
    };
  }
});

export const providers = [googleProvider, credentialsProvider]; 