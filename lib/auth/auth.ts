import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Import configurations and utilities
import { validateEnvironmentVariables, cookieConfig, sessionConfig, pagesConfig } from './config';
import { providers } from './providers';
import { sessionCallback, signInCallback, eventsCallbacks } from './callbacks';

// Import types
import './types';

const prisma = new PrismaClient();

// Validate environment variables
validateEnvironmentVariables();

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: sessionConfig,
  cookies: cookieConfig,
  callbacks: {
    session: sessionCallback,
    signIn: signInCallback
  },
  pages: pagesConfig,
  secret: process.env.NEXTAUTH_SECRET,
  events: eventsCallbacks
};

// Re-export everything for backward compatibility
export * from './types';
export * from './config';
export * from './providers';
export * from './utils';
export * from './session-manager';
export * from './callbacks';
export * from './helpers'; 