import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, getCurrentSessionInfo } from '@/lib/auth/auth'
import { prisma } from '@/lib/services/prisma'
import { cacheDeletePattern } from '@/lib/cache/cache-service'
import { getUserRelatedPatterns } from '@/lib/cache/cache-keys'


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'No active session' }), {
        status: 401,
      })
    }

    // Get current session info
    const currentSession = await getCurrentSessionInfo(session.user.id)
    
    if (currentSession) {
      // Delete the current session
      await prisma.session.delete({
        where: { id: currentSession.id }
      })
    }

    // Clear user-specific cache
    try {
      const patterns = getUserRelatedPatterns(session.user.id)
      console.log(`[Logout] Clearing cache for user ${session.user.id} with patterns:`, patterns)
      
      const results = await Promise.all(
        patterns.map(pattern => cacheDeletePattern(pattern))
      )
      
      const deletedCount = results.reduce((acc, curr) => acc + curr, 0)
      console.log(`[Logout] Cleared ${deletedCount} cache keys`)
    } catch (cacheError) {
      // Don't fail the logout if cache clearing fails
      console.error('[Logout] Failed to clear user cache:', cacheError)
    }

    // Create response with cleared cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    })

    // Clear session cookies
    response.cookies.delete('next-auth.session-token')
    response.cookies.delete('__Secure-next-auth.session-token')
    response.cookies.delete('next-auth.csrf-token')
    response.cookies.delete('__Secure-next-auth.csrf-token')
    response.cookies.delete('next-auth.callback-url')
    response.cookies.delete('__Secure-next-auth.callback-url')

    return response
  } catch (error) {
    console.error('Error during logout:', error)
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
} 
