import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis only if env vars are present
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Defined rate limits
const ratelimit = redis
  ? {
      // Strict limit for auth routes: 5 requests per 60s
      auth: new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        analytics: true,
        prefix: "ratelimit_auth",
      }),
      // General API limit: 50 requests per 10s
      api: new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(50, "10 s"),
        analytics: true,
        prefix: "ratelimit_api",
      }),
    }
  : null;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|js|css)$).*)",
  ],
};

export default async function proxy(request: NextRequest) {
  const ip = (request as any).ip ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const path = request.nextUrl.pathname;

  // 2. Identify route type
  const isAuthRoute = path.startsWith("/api/auth");
  const isApiRoute = path.startsWith("/api");

  // 1. Skip if Redis is not configured (fail open) for Rate Limiting
  // If no Redis, we just proceed to Auth Logic
  if (ratelimit) {
    // Rate limiting logic
    if (isAuthRoute) {
      const { success, limit, reset, remaining } = await ratelimit.auth.limit(
        `auth_${ip}`
      );
      if (!success) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many login attempts. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }
    } else if (isApiRoute) {
      // General API rate limit
      const { success, limit, reset, remaining } = await ratelimit.api.limit(
        `api_${ip}`
      );
      if (!success) {
        return new NextResponse(
          JSON.stringify({ error: "Rate limit exceeded" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }
    }
  }

  // --- Auth Protection Logic (Merged from proxy.ts) ---

  // Skip auth middleware for API routes and static files
  // (API routes are protected by session checks inside the route handlers usually, 
  // but if we want middleware protection for API, we can add it here. 
  // For now, mirroring proxy.ts behavior which skips API for auth redirects)
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/api/') || // Skip API for auth redirects (but we rate limited them above)
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Define protected routes (from proxy.ts)
  const protectedRoutes = [
    '/dashboard',
    '/groups',
    '/periods',
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

  // Define auth pages
  const authPages = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email'
  ]

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    path === route || path.startsWith(route + '/')
  )

  // Check if current path is an auth page
  const isAuthPage = authPages.some(page =>
    path === page || path.startsWith(page + '/')
  )

  // Check for session token in cookies
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  // Handle protected routes - redirect to login with callbackUrl
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && sessionToken) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard'
    const redirectUrl = new URL(callbackUrl, request.url)

    // Prevent open redirects
    if (!redirectUrl.pathname.startsWith('/')) {
      redirectUrl.pathname = '/dashboard'
    }

    return NextResponse.redirect(redirectUrl)
  }

  // For authenticated users on protected routes, trigger session update
  if (isProtectedRoute && sessionToken) {
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
