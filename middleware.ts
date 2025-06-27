import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Define protected routes (these are inside the (auth) route group)
  const protectedRoutes = [
    '/dashboard',
    '/groups',
    '/settings',
    '/market',
    '/expenses',
    '/account-balance',
    '/analytics',
    '/excel',
    '/calculations',
    '/notifications',
    '/shopping',
    '/voting',
    '/meals',
    '/payments',
    '/profile'
  ]

  // Define auth pages (these are outside the (auth) route group)
  const authPages = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email'
  ]

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Check if current path is an auth page
  const isAuthPage = authPages.some(page => 
    pathname === page || pathname.startsWith(page + '/')
  )

  // Get the session token
  let token = null
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
  } catch (error) {
    console.error('Error getting token:', error)
  }

  // Handle protected routes - redirect to login with callbackUrl
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard'
    const redirectUrl = new URL(callbackUrl, request.url)
    
    // Prevent open redirects
    if (!redirectUrl.pathname.startsWith('/')) {
      redirectUrl.pathname = '/dashboard'
    }
    
    return NextResponse.redirect(redirectUrl)
  }

  // For authenticated users on protected routes, trigger session update
  if (isProtectedRoute && token) {
    // Add a header to indicate this is a protected route request
    // This can be used by API routes to update session info
    const response = NextResponse.next()
    response.headers.set('x-session-update', 'true')
    return response
  }

  // Ensure proper cookie handling for OAuth
  const response = NextResponse.next()
  
  // Set SameSite attribute for cookies in development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Set-Cookie', 'SameSite=Lax')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
