import { PrismaClient } from "@prisma/client";
import { parseDeviceInfo, capitalizeDeviceType } from './utils';
import { LocationData } from './types';

import { prisma } from "@/lib/services/prisma"

/**
 * Retrieves the most recent active session for a specific user.
 * 
 * @param userId - The ID of the user to fetch the session for.
 * @returns The session object if found, otherwise null.
 */
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
    // Error handled silently
    return null;
  }
}

/**
 * Retrieves all active sessions for a specific user.
 * 
 * @param userId - The ID of the user to fetch sessions for.
 * @returns An array of active session objects.
 */
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
    // Error handled silently
    return [];
  }
}

/**
 * Updates an existing session's information (IP, Device, Location).
 * 
 * @param sessionToken - The token of the session to update.
 * @param userAgent - The raw User-Agent string from the request.
 * @param ipAddress - The client's IP address.
 * @param userId - (Optional) The user ID to help locate session if token is missing.
 * @param locationData - (Optional) GeoIP data for the session.
 * @returns boolean indicating success or failure.
 */
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
    // Error handled silently
    return false;
  }
}

/**
 * Revokes (deletes) a specific session for a user.
 * 
 * @param sessionId - The unique ID of the session to revoke.
 * @param userId - The ID of the user who owns the session (for security).
 * @returns boolean indicating success.
 */
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
    // Error handled silently
    return false;
  }
}

/**
 * Revokes (deletes) multiple sessions for a user.
 * 
 * @param sessionIds - Array of session IDs to revoke.
 * @param userId - The ID of the user who owns the sessions.
 * @returns The number of sessions deleted.
 */
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
    // Error handled silently
    return 0;
  }
}

/**
 * Revokes (deletes) ALL active sessions for a user (Global Sign Out).
 * 
 * @param userId - The ID of the user.
 * @returns The number of sessions deleted.
 */
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
    // Error handled silently
    return 0;
  }
}

// Function to check if a session is the current session by ID
export async function isCurrentSessionById(sessionId: string, userId: string) {
  try {
    const currentSession = await getCurrentSessionInfo(userId);
    return currentSession?.id === sessionId;
  } catch (error) {
    // Error handled silently
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
    // Comment out all console.log and debugging statements
  }
} 