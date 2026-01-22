import { NextRequest } from 'next/server';

/**
 * In-memory rate limiting fallback when Redis is not available
 * This provides basic protection in development and as a fallback
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  async limit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // New window
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });

      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: Math.ceil((now + windowMs) / 1000),
      };
    }

    // Existing window
    if (entry.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: Math.ceil(entry.resetTime / 1000),
      };
    }

    entry.count++;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: Math.ceil(entry.resetTime / 1000),
    };
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
let inMemoryLimiter: InMemoryRateLimiter | null = null;

export function getInMemoryRateLimiter(): InMemoryRateLimiter {
  if (!inMemoryLimiter) {
    inMemoryLimiter = new InMemoryRateLimiter();
  }
  return inMemoryLimiter;
}

/**
 * Rate limit middleware using in-memory storage
 */
export async function rateLimitInMemory(
  request: NextRequest,
  options: {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
  }
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const limiter = getInMemoryRateLimiter();
  
  // Create key from IP and user agent
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             request.headers.get('x-real-ip') ||
             '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const key = `${options.keyPrefix || 'rl'}:${ip}:${userAgent}`;

  return limiter.limit(key, options.maxRequests, options.windowMs);
}
