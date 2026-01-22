import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import crypto from 'crypto';

const CSRF_SECRET = process.env.NEXTAUTH_SECRET!;
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  const randomBytes = crypto.randomBytes(CSRF_TOKEN_LENGTH);
  const token = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(sessionId + randomBytes.toString('hex'))
    .digest('hex');
  
  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { valid: false, error: 'No session' };
  }

  // Get token from header
  const headerToken = request.headers.get('x-csrf-token');
  
  // Get token from cookie
  const cookieToken = request.cookies.get('csrf-token')?.value;

  if (!headerToken || !cookieToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }

  // Tokens must match
  if (headerToken !== cookieToken) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  // Token is valid
  return { valid: true };
}

/**
 * Middleware wrapper for CSRF protection
 */
export function withCsrfProtection(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const validation = await validateCsrfToken(req);
      
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'CSRF validation failed', details: validation.error },
          { status: 403 }
        );
      }
    }

    return handler(req, ...args);
  };
}
