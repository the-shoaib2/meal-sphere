import { AuthOptions, getServerSession, DefaultSession, DefaultUser, Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, User as PrismaUser } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { UAParser } from 'ua-parser-js';

const prisma = new PrismaClient();

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is required');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET is required');
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required');
}
if (!process.env.NEXTAUTH_URL) {
  // console.warn('NEXTAUTH_URL is not set. This may cause issues in production.');
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
      role: Role;
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

  interface User extends DefaultUser {
    role: Role;
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
    role: Role;
  }
}

// Create Google provider with explicit environment variable access
const googleProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    googleProvider,
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
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
            role: true,
            password: true
          }
        }) as (PrismaUser & { password: string | null }) | null;

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
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role
        };
      }
    })
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    pkceCodeVerifier: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.pkce.code_verifier' : 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15 // 15 minutes
      }
    },
    state: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.state' : 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15 // 15 minutes
      }
    },
    nonce: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.nonce' : 'next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    async session({ session, token, user }) {
      // Add user info to the session
      if (user) {
        session.user.id = user.id;
        session.user.name = user.name || undefined;
        session.user.email = user.email || undefined;
        session.user.image = user.image || undefined;
        session.user.role = user.role;
      }
      
      return session;
    },
    async signIn(params) {
      const { user, account, profile } = params;
      
      try {
        // console.log('🔍 SignIn callback started:', {
        //   userEmail: user.email,
        //   provider: account?.provider,
        //   hasEmail: !!user.email
        // });

        if (account?.provider === 'google') {
          if (!user.email) {
            console.error('❌ No email found in user object from Google OAuth');
            console.log('User object:', user);
            console.log('Account object:', account);
            return false; 
          }

          // Check if user exists with this email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (!existingUser) {
            // console.log('🆕 Creating new user for:', user.email);
            // Create a new user with default values
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split('@')[0], 
                image: user.image,
                role: 'MEMBER',
                emailVerified: new Date(),
                language: 'en',
                isActive: true,
                password: null, // Since it's a Google sign-in
                resetToken: null,
                resetTokenExpiry: null,
                accounts: {
                  create: {
                    type: 'oauth',
                    provider: 'google',
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token
                  }
                }
              },
              include: { accounts: true }
            });
            
            user.id = newUser.id;
            user.role = newUser.role;
            // console.log('✅ New user created:', newUser.id);
          } else {
            // console.log('👤 Existing user found:', existingUser.id);
            // Check if user has a Google account linked
            const hasGoogleAccount = existingUser.accounts.some(
              acc => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
            );

            if (!hasGoogleAccount) {
              // console.log('🔗 Linking Google account to existing user');
              // Link the Google account to the existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: 'oauth',
                  provider: 'google',
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token
                }
              });
            }
            
            // Update the user object with existing user's data
            user.id = existingUser.id;
            user.role = existingUser.role;
          }
        }
        
        // console.log('✅ SignIn callback completed successfully');
        return true;
      } catch (error) {
        console.error('❌ Error in signIn callback:', error);
        // console.log('🔍 SignIn callback error details:', {
        //   user: user?.email,
        //   provider: account?.provider,
        //   error: error instanceof Error ? error.message : error,
        //   stack: error instanceof Error ? error.stack : undefined
        // });
        
        // Log the full error for debugging
        if (error instanceof Error) {
          console.error('Full error stack:', error.stack);
        }
        
        // Return true to allow the sign-in to continue even if there's an error
        return true;
      }
    }
  },
  pages: {
    signIn: '/login',
    error: '/login/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  // debug: true, // Enable debug logging to see what's happening
  // logger: {
  //   error(code, metadata) {
  //     console.error('NextAuth Error:', code, metadata);
  //   },
  //   warn(code) {
  //     console.warn('NextAuth Warning:', code);
  //   },
  //   debug(code, metadata) {
  //     if (process.env.NODE_ENV === 'development') {
  //       console.log('NextAuth Debug:', code, metadata);
  //     }
  //   }
  // },
  events: {
    async signIn(message) {
      // console.log('🎉 User signed in event:', {
      //   email: message.user?.email,
      //   provider: message.account?.provider,
      //   userId: message.user?.id
      // });
      
      // Update the most recent session with device info if available
      if (message.user?.id) {
        try {
          // Get the most recent session for this user and update it with device info
          const session = await prisma.session.findFirst({
            where: { 
              userId: message.user.id,
              expires: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
          });
          
          if (session) {
            // Parse user agent for device info
            const userAgent = session.userAgent || '';
            const parser = new UAParser(userAgent);
            const device = parser.getDevice();
            const os = parser.getOS();
            const browser = parser.getBrowser();
            
            // Better device type detection
            const deviceType = device.type || 
                              (userAgent.toLowerCase().includes('mobile') ? 'mobile' : 
                               userAgent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop');
            
            // Better device model detection with fallbacks
            let deviceModel = '';
            if (device.vendor && device.model) {
              deviceModel = `${device.vendor} ${device.model}`.trim();
            } else if (device.model) {
              deviceModel = device.model;
            } else if (os.name) {
              deviceModel = `${os.name} ${os.version || ''}`.trim();
            } else if (browser.name) {
              deviceModel = `${browser.name} ${browser.version || ''}`.trim();
            }

            // Update the session with device info
            await prisma.session.update({
              where: { id: session.id },
              data: {
                deviceType: deviceType || 'desktop',
                deviceModel: deviceModel || '',
                updatedAt: new Date()
              }
            });
          }
        } catch (error) {
          console.error('Error updating session with device info:', error);
        }
      }
    },
    async signOut(message) {
      // console.log('👋 User signed out event:', {
      //   email: message.session?.user?.email
      // });
    }
  }
};

// Helper function to get session with device info (for API routes)
const getServerAuthSessionForApi = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);

  if (session) {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();

    // Update session with device info
    (session as any).userAgent = userAgent || '';
    (session as any).ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.headers['x-real-ip']?.toString() ||
      (req.socket as any)?.remoteAddress || '';
    (session as any).deviceType = device.type || 'desktop';
    (session as any).deviceModel = `${device.vendor || ''} ${device.model || ''}`.trim() || '';
    (session as any).browser = `${browser.name || ''} ${browser.version || ''}`.trim() || '';
    (session as any).os = `${os.name || ''} ${os.version || ''}`.trim() || '';

    // Update the session in the database
    try {
      await prisma.session.updateMany({
        where: {
          sessionToken: (session as any).sessionToken,
          userId: session.user.id
        },
        data: {
          userAgent: (session as any).userAgent || '',
          ipAddress: (session as any).ipAddress || '',
          deviceType: (session as any).deviceType || 'desktop',
          deviceModel: (session as any).deviceModel || '',
          updatedAt: new Date()
        }
      });
    } catch (error) {
      // console.error('Error updating session info:', error);
    }
  }

  return session;
};

// For Server Components
export const getServerAuthSession = async () => {
  return await getServerSession(authOptions);
};

// For API routes
export const getApiAuthSession = async (req: NextApiRequest, res: NextApiResponse) => {
  return getServerAuthSessionForApi(req, res);
};

// Utility function to extract client info from request
function extractClientInfo(req: any) {
  let userAgent = '';
  let ipAddress = '';

  if (req) {
    userAgent = req.headers?.['user-agent'] || '';

    // Try multiple headers for IP address
    ipAddress = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.headers?.['cf-connecting-ip'] || // Cloudflare
      req.headers?.['x-client-ip'] ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      '';
  }

  // Clean up IP address (remove IPv6 prefix if present)
  if (ipAddress && ipAddress.startsWith('::ffff:')) {
    ipAddress = ipAddress.substring(7);
  }

  // if (!userAgent || !ipAddress) {
  //   console.warn('User agent or IP address missing in extractClientInfo', { 
  //     userAgent: userAgent || 'missing', 
  //     ipAddress: ipAddress || 'missing',
  //     headers: req?.headers ? Object.keys(req.headers) : 'no headers'
  //   });
  // }

  return { userAgent, ipAddress };
}

// Helper function to get current session token from request
export function getCurrentSessionToken(request: any): string | null {
  return request.cookies?.get('next-auth.session-token')?.value ||
    request.cookies?.get('__Secure-next-auth.session-token')?.value ||
    null;
}

// Helper function to get current session info
export async function getCurrentSessionInfo(userId: string) {
  try {
    // Get the most recent active session for the user
    const currentSession = await prisma.session.findFirst({
      where: {
        userId,
        expires: { gt: new Date() }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    return currentSession;
  } catch (error) {
    console.error('Error getting current session info:', error);
    return null;
  }
}

// Helper function to get all active sessions for a user
export async function getAllActiveSessions(userId: string) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expires: { gt: new Date() }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    return sessions;
  } catch (error) {
    console.error('Error getting all active sessions:', error);
    return [];
  }
}

// Utility function to update session info
export async function updateSessionInfo(
  sessionToken: string, 
  userAgent: string, 
  ipAddress: string, 
  userId?: string,
  locationData?: { city?: string; country?: string; latitude?: number; longitude?: number }
) {
  try {
    // First, verify the session exists
    let existingSession = await prisma.session.findUnique({
      where: { sessionToken }
    });

    // If session not found by token and userId is provided, try to find the most recent session for the user
    if (!existingSession && userId) {
      // console.warn('Session not found for token, trying to find by user ID:', sessionToken);
      existingSession = await prisma.session.findFirst({
        where: {
          userId,
          expires: { gt: new Date() }
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      if (existingSession) {
        // console.log('Found session by user ID, updating with new token:', existingSession.sessionToken);
        // Update the session token to match the current one
        await prisma.session.update({
          where: { id: existingSession.id },
          data: { sessionToken }
        });
      }
    }

    if (!existingSession) {
      // console.warn('Session not found for token:', sessionToken);
      return false;
    }

    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();
    
    // Better device type detection
    const deviceType = device.type || 
                      (userAgent.toLowerCase().includes('mobile') ? 'mobile' : 
                       userAgent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop');
    
    // Better device model detection with fallbacks
    let deviceModel = '';
    if (device.vendor && device.model) {
      deviceModel = `${device.vendor} ${device.model}`.trim();
    } else if (device.model) {
      deviceModel = device.model;
    } else if (os.name) {
      deviceModel = `${os.name} ${os.version || ''}`.trim();
    } else if (browser.name) {
      deviceModel = `${browser.name} ${browser.version || ''}`.trim();
    }

    // Clean up IP address (remove IPv6 prefix if present)
    const cleanIpAddress = ipAddress && ipAddress.startsWith('::ffff:') 
      ? ipAddress.substring(7) 
      : ipAddress;

    await prisma.session.update({
      where: { sessionToken },
      data: {
        userAgent: userAgent || '',
        ipAddress: cleanIpAddress || '',
        deviceType: deviceType || 'desktop',
        deviceModel: deviceModel || '',
        city: locationData?.city || null,
        country: locationData?.country || null,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
        updatedAt: new Date()
      }
    });

    return true;
  } catch (error) {
    // console.error('Error updating session info:', error);
    return false;
  }
}
