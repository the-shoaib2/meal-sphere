import { updateSessionWithDeviceInfo } from '@/lib/auth/session-manager';
import { getLocationFromIP } from '@/lib/utils/location-utils';

import { prisma } from "@/lib/services/prisma"

/**
 * JWT Callback
 * Handles token generation and updates.
 * Implements asynchronous session tracking for performance.
 */
export async function jwtCallback({ token, user, account, profile, trigger, session }: any) {
  // Initial sign in
  if (user) {
    token.id = user.id;
    token.name = user.name;
    token.email = user.email;
    token.picture = user.image;

    // Asynchronous session tracking
    // Generates session ID immediately and persists to DB in background
    try {
        const sessionToken = crypto.randomUUID();
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        
        token.sessionId = sessionToken; 
        
        // Fire-and-forget session creation
        prisma.session.create({
            data: {
                userId: user.id,
                sessionToken: sessionToken,
                expires: expires,
                userAgent: 'Unknown (New Login)', // Will be updated by client
                ipAddress: '',
            }
        }).catch(err => {
             // Silently fail to avoid blocking auth flow
             // console.error("Background session creation failed:", err);
        });
        
    } catch (e) {
        // console.error("Failed to setup tracking session", e);
    }
  }
  
  // If we are updating the session (e.g. from client side)
  if (trigger === "update" && session) {
      if (session.user) {
        token.name = session.user.name;
        token.email = session.user.email;
        token.picture = session.user.image;
      }
      return { ...token, ...session };
  }
  
  return token;
}

// Session callback
export async function sessionCallback({ session, token, user }: any) {
  // Add user info to the session
  // When using JWT strategy, user info comes from the token
  if (token) {
    session.user.id = token.id;
    session.user.name = token.name;
    session.user.email = token.email;
    session.user.image = token.picture;
    session.sessionToken = token.sessionId; 
  }
  // When using Database strategy, user info comes from the user object
  else if (user) {
    session.user.id = user.id;
    session.user.name = user.name || undefined;
    session.user.email = user.email || undefined;
    session.user.image = user.image || undefined;
  }

  return session;
}

/**
 * Sign In Callback
 * Handles post-login validation and account linking.
 */
export async function signInCallback(params: any) {
  const { user, account, profile } = params;

  try {
    if (account?.provider === 'google') {
      if (!user.email) {
        return false;
      }

      // 1. Fast path: Check for existing account link directly
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: account.providerAccountId
          }
        },
        select: { userId: true }
      });

      if (existingAccount) {
        user.id = existingAccount.userId;
        return true;
      }

      // 2. Slow path: Check user by email and create/link account
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });

      if (!existingUser) {
        // Create new user
        const newUser = await prisma.user.create({
          data: {
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image,
            emailVerified: new Date(),
            language: 'en',
            isActive: true,
            password: null, 
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
          }
        });

        user.id = newUser.id;
      } else {
        // Link existing user to Google account
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

        user.id = existingUser.id;
      }
    } 
    
    return true;
  } catch (error) {
    console.error('Error in signIn callback:', error);
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Full error stack:', error.stack);
    }

    // Return true to allow the sign-in to continue even if there's an error
    return true;
  }
}

// Events callbacks
export const eventsCallbacks = {
  async signIn(message: any) {


    // try {
    //   // Update the most recent session with device info and location if available
    //   if (message.user?.id) {
    //     // Get the most recent session for this user
    //     const session = await prisma.session.findFirst({
    //       where: {
    //         userId: message.user.id,
    //         expires: { gt: new Date() }
    //       },
    //       orderBy: { createdAt: 'desc' }
    //     });

    //     if (session) {


    //       // Parse user agent for device info
    //       const userAgent = session.userAgent || '';
    //       const deviceInfo = parseDeviceInfo(userAgent);

    //       // Get IP address from session
    //       const ipAddress = session.ipAddress;

    //       // Get location data if we have an IP address
    //       let locationData: { city?: string; country?: string; latitude?: number; longitude?: number } = {};
    //       if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== 'localhost' && ipAddress !== '::1') {
    //         locationData = await getLocationFromIP(ipAddress);
    //       } else if (ipAddress) {
    //         locationData = {
    //           city: 'Localhost',
    //           country: 'Development',
    //           latitude: undefined,
    //           longitude: undefined
    //         }
    //       }

    //       // Update the session with device info and location
    //       await prisma.session.update({
    //         where: { id: session.id },
    //         data: {
    //           deviceType: capitalizeDeviceType(deviceInfo.deviceType),
    //           deviceModel: deviceInfo.deviceModel || '',
    //           city: locationData.city || null,
    //           country: locationData.country || null,
    //           latitude: locationData.latitude || null,
    //           longitude: locationData.longitude || null,
    //           updatedAt: new Date()
    //         }
    //       });


    //     } else {

    //     }
    //   }
    // } catch (error) {
    //   // Error updating session in signIn event
    // }
  },

  async signOut(message: any) {
    // Handle sign out events if needed
  }
};

// Helper functions (copied from session-manager.ts to avoid circular imports)
function parseDeviceInfo(userAgent: string) {
  if (!userAgent) {
    return { deviceType: 'Unknown', deviceModel: '' };
  }

  const ua = userAgent.toLowerCase();

  // Mobile detection
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    if (ua.includes('iphone')) {
      return { deviceType: 'Mobile', deviceModel: 'iPhone' };
    } else if (ua.includes('ipad')) {
      return { deviceType: 'Tablet', deviceModel: 'iPad' };
    } else if (ua.includes('android')) {
      return { deviceType: 'Mobile', deviceModel: 'Android' };
    } else {
      return { deviceType: 'Mobile', deviceModel: 'Mobile Device' };
    }
  }

  // Desktop detection
  if (ua.includes('windows')) {
    return { deviceType: 'Desktop', deviceModel: 'Windows PC' };
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    return { deviceType: 'Desktop', deviceModel: 'Mac' };
  } else if (ua.includes('linux')) {
    return { deviceType: 'Desktop', deviceModel: 'Linux PC' };
  }

  return { deviceType: 'Desktop', deviceModel: 'Desktop' };
}

function capitalizeDeviceType(deviceType: string): string {
  if (!deviceType) return 'Unknown';
  return deviceType.charAt(0).toUpperCase() + deviceType.slice(1).toLowerCase();
} 