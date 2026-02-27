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
    password: { label: "Password", type: "password" },
    passkey: { label: "Passkey", type: "boolean" },
    credentialID: { label: "Credential ID", type: "text" },
    userId: { label: "User ID", type: "text" }
  },
  async authorize(credentials) {
    if (credentials?.passkey === "true") {
      const { credentialID, userId } = credentials;
      if (!credentialID || !userId) {
        throw new Error("Missing passkey authentication data");
      }

      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image
      };
    }

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

    // Use a dummy hash if user doesn't exist to prevent timing attacks
    const passwordHash = user?.password || '$2a$12$dummyhashtopreventtimingattack1234567890abcdefghijklmnopqr';
    
    const isPasswordValid = await bcrypt.compare(
      credentials.password as string,
      passwordHash
    );

    if (!user || !user.password || !isPasswordValid) {
      throw new Error("Invalid credentials");
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