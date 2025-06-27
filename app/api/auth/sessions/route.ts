import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { 
  updateSessionInfo, 
  getCurrentSessionInfo, 
  getAllActiveSessions,
  revokeMultipleSessions
} from '@/lib/auth/session-manager'
import { getLocationFromIP } from '@/lib/location-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    // Get user agent and IP from request headers
    const userAgent = request.headers.get('user-agent') || ''
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      request.headers.get('x-client-ip') ||
      (request as any).ip || // Next.js edge runtime may provide this
      ''

    // Get current session token from cookies
    const currentSessionToken = request.cookies.get('next-auth.session-token')?.value ||
                               request.cookies.get('__Secure-next-auth.session-token')?.value

    // Get all active sessions for the user
    const allSessions = await getAllActiveSessions(session.user.id)

    // Update the current session with the latest device info and location
    if (currentSessionToken && (userAgent || ipAddress)) {
      try {
        // Get location data if we have an IP address
        let locationData = {}
        if (ipAddress) {
          locationData = await getLocationFromIP(ipAddress)
        }

        await updateSessionInfo(
          currentSessionToken, 
          userAgent, 
          ipAddress, 
          session.user.id,
          locationData
        )
      } catch (error) {
        console.error('Error updating session info:', error)
        // Continue with fetching sessions even if update fails
      }
    }

    // Re-fetch sessions to get updated info
    const updatedSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        expires: { gt: new Date() }
      },
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
        ipAddress: true,
        userAgent: true,
        deviceType: true,
        deviceModel: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(updatedSessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    let ids: string[] = []
    
    try {
      const body = await request.json()
      ids = body?.ids || []
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return new NextResponse(JSON.stringify({ error: 'Invalid request body format' }), {
        status: 400,
      })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Session IDs array is required and must not be empty' }), {
        status: 400,
      })
    }

    // Validate that all IDs are valid ObjectId format
    const validIds = ids.filter(id => /^[0-9a-fA-F]{24}$/.test(id))
    
    if (validIds.length !== ids.length) {
      return new NextResponse(JSON.stringify({ error: 'Some session IDs are invalid' }), {
        status: 400,
      })
    }

    // Check if current session is being deleted
    const currentSession = await getCurrentSessionInfo(session.user.id)
    const isCurrentSessionDeleted = currentSession && validIds.includes(currentSession.id)

    // Revoke the sessions using the session manager
    const deletedCount = await revokeMultipleSessions(validIds, session.user.id)

    if (deletedCount === 0) {
      return new NextResponse(JSON.stringify({ error: 'No sessions were deleted' }), {
        status: 404,
      })
    }

    // If current session was deleted, return special response to trigger logout
    if (isCurrentSessionDeleted) {
      return NextResponse.json({ 
        success: true, 
        deletedCount,
        message: `Successfully deleted ${deletedCount} session(s)`,
        logoutRequired: true,
        reason: 'Current session was revoked'
      })
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} session(s)`
    })
  } catch (error) {
    console.error('Error revoking sessions:', error)
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}

// Frontend usage: Call fetch('/api/auth/sessions') after login or on first page load after authentication to ensure device info is updated.
