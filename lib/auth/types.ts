import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    } & DefaultSession["user"];

    // Extended session properties
    userAgent?: string;
    ipAddress?: string | null;
    deviceType?: string;
    deviceModel?: string | null;
    browser?: string | null;
    os?: string | null;
    sessionToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    sub?: string;
    iat?: number;
    exp?: number;
    jti?: string;
  }
}

export interface ClientInfo {
  userAgent: string;
  ipAddress: string;
}

export interface LocationData {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface DeviceInfo {
  deviceType: string;
  deviceModel: string;
  browser?: string;
  os?: string;
} 