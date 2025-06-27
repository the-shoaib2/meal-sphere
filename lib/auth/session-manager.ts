import { PrismaClient } from "@prisma/client";
import { parseDeviceInfo, capitalizeDeviceType } from './utils';
import { LocationData } from './types';

const prisma = new PrismaClient();

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
  locationData?: LocationData
) {
  try {
    // First, verify the session exists
    let existingSession = await prisma.session.findUnique({
      where: { sessionToken }
    });

    // If session not found by token and userId is provided, try to find the most recent session for the user
    if (!existingSession && userId) {
      existingSession = await prisma.session.findFirst({
        where: {
          userId,
          expires: { gt: new Date() }
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      if (existingSession) {
        // Update the session token to match the current one
        await prisma.session.update({
          where: { id: existingSession.id },
          data: { sessionToken }
        });
      }
    }

    if (!existingSession) {
      return false;
    }

    const deviceInfo = parseDeviceInfo(userAgent);

    // Clean up IP address (remove IPv6 prefix if present)
    const cleanIpAddress = ipAddress && ipAddress.startsWith('::ffff:') 
      ? ipAddress.substring(7) 
      : ipAddress;

    await prisma.session.update({
      where: { sessionToken },
      data: {
        userAgent: userAgent || '',
        ipAddress: cleanIpAddress || '',
        deviceType: capitalizeDeviceType(deviceInfo.deviceType),
        deviceModel: deviceInfo.deviceModel || '',
        city: locationData?.city || null,
        country: locationData?.country || null,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
        updatedAt: new Date()
      }
    });

    return true;
  } catch (error) {
    console.error('Error updating session info:', error);
    return false;
  }
}

// Function to revoke a specific session
export async function revokeSession(sessionId: string, userId: string) {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: userId
      }
    });
    
    return result.count > 0;
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
}

// Function to revoke multiple sessions
export async function revokeMultipleSessions(sessionIds: string[], userId: string) {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        id: {
          in: sessionIds
        },
        userId: userId
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('Error revoking multiple sessions:', error);
    return 0;
  }
}

// Function to revoke all sessions for a user
export async function revokeAllSessions(userId: string) {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        userId: userId,
        expires: { gt: new Date() }
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return 0;
  }
}

// Function to check if a session is the current session
export async function isCurrentSession(sessionId: string, userId: string) {
  try {
    const currentSession = await getCurrentSessionInfo(userId);
    return currentSession?.id === sessionId;
  } catch (error) {
    console.error('Error checking if session is current:', error);
    return false;
  }
}

// Function to update session with device info during sign in
export async function updateSessionWithDeviceInfo(userId: string) {
  try {
    // Get the most recent session for this user and update it with device info
    const session = await prisma.session.findFirst({
      where: { 
        userId,
        expires: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (session) {
      // Parse user agent for device info
      const userAgent = session.userAgent || '';
      const deviceInfo = parseDeviceInfo(userAgent);

      // Update the session with device info
      await prisma.session.update({
        where: { id: session.id },
        data: {
          deviceType: capitalizeDeviceType(deviceInfo.deviceType),
          deviceModel: deviceInfo.deviceModel || '',
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error updating session with device info:', error);
  }
} 