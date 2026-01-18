import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ------------------------------------------------------------------ */
/* Redis + Rate Limit Setup                                           */
/* ------------------------------------------------------------------ */

const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit = redis
  ? {
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          process.env.NODE_ENV === "development" ? 200 : 500, 
          "60 s"
        ),
        analytics: true,
        prefix: "rl_auth",
      }),
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          process.env.NODE_ENV === "development" ? 1000 : 100,
          "10 s"
        ),
        analytics: true,
        prefix: "rl_api",
      }),
    }
  : null;

/* ------------------------------------------------------------------ */
/* Middleware Matcher                                                 */
/* ------------------------------------------------------------------ */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|css|js)$).*)",
  ],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Use a type-safe way to access ip if it exists
  const ip = (request as any).ip;
  if (ip) return ip;

  return "127.0.0.1";
}

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value
  );
}

/* ------------------------------------------------------------------ */
/* Middleware                                                         */
/* ------------------------------------------------------------------ */

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  const isApiRoute = pathname.startsWith("/api");
  const isAuthApi = pathname.startsWith("/api/auth");

  /* -------------------------------------------------------------- */
  /* Rate Limiting                                                  */
  /* -------------------------------------------------------------- */

  if (ratelimit) {
    const key = `${ip}:${userAgent}`;

    if (isAuthApi) {
      const { success, limit, remaining, reset } =
        await ratelimit.auth.limit(`auth:${key}`);

      if (!success) {
        return NextResponse.json(
          { error: "Too many login attempts. Try again later." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }
    } else if (isApiRoute) {
      const { success, limit, remaining, reset } =
        await ratelimit.api.limit(`api:${key}:${pathname}`);

      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }
    }
  }

  /* -------------------------------------------------------------- */
  /* Skip Auth Redirects for API / Static                            */
  /* -------------------------------------------------------------- */

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  /* -------------------------------------------------------------- */
  /* Auth & Page Protection                                         */
  /* -------------------------------------------------------------- */

  const protectedRoutes = [
    "/dashboard",
    "/groups",
    "/periods",
    "/settings",
    "/market",
    "/expenses",
    "/account-balance",
    "/analytics",
    "/excel",
    "/calculations",
    "/notifications",
    "/shopping",
    "/voting",
    "/meals",
    "/payments",
    "/profile",
  ];

  const authPages = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isAuthPage = authPages.some(
    (page) => pathname === page || pathname.startsWith(page + "/")
  );

  /* -------------------------------------------------------------- */
  // Check for session token in cookies
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  // console.log(`[Middleware] Path: ${pathname}, Session: ${!!sessionToken}`);

  // Handle protected routes - redirect to login with callbackUrl
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
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

  return NextResponse.next()
}
