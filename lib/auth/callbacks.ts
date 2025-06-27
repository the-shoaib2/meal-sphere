import { PrismaClient } from "@prisma/client";
import { updateSessionWithDeviceInfo } from './session-manager';

const prisma = new PrismaClient();

// Session callback
export async function sessionCallback({ session, token, user }: any) {
  // Add user info to the session
  if (user) {
    session.user.id = user.id;
    session.user.name = user.name || undefined;
    session.user.email = user.email || undefined;
    session.user.image = user.image || undefined;
    session.user.role = user.role;
  }
  
  return session;
}

// Sign in callback
export async function signInCallback(params: any) {
  const { user, account, profile } = params;
  
  try {
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
      } else {
        // Check if user has a Google account linked
        const hasGoogleAccount = existingUser.accounts.some(
          acc => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
        );

        if (!hasGoogleAccount) {
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
    
    return true;
  } catch (error) {
    console.error('❌ Error in signIn callback:', error);
    
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
    // Update the most recent session with device info if available
    if (message.user?.id) {
      await updateSessionWithDeviceInfo(message.user.id);
    }
  },
  
  async signOut(message: any) {
    // Handle sign out events if needed
  }
}; 