import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { generateCsrfToken } from '@/lib/middleware/csrf';

/**
 * GET /api/csrf - Generate and return CSRF token
 * This endpoint should be called when the app initializes to get a CSRF token
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = generateCsrfToken(session.user.id);
  
  const response = NextResponse.json({ token });
  
  // Set CSRF token in HTTP-only cookie
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}
