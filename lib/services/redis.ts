import Redis from 'ioredis';

// Singleton Redis client
let redis: Redis | null = null;

/**
 * Get or create Redis client instance
 * Gracefully handles Redis unavailability by returning null
 */
export function getRedisClient(): Redis | null {
  // If Redis is disabled via env var, return null
  if (process.env.DISABLE_CACHE === 'true') {
    return null;
  }

  // Return existing instance if available
  if (redis) {
    return redis;
  }

  // Check if Redis URL is configured
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL not configured. Caching disabled.');
    return null;
  }

  try {
    // Create new Redis instance with optimized settings
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
      // Connection pool settings
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: true,
    });

    // Handle connection events
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
      // Don't crash the app, just disable caching
      redis = null;
    });

    redis.on('close', () => {
      console.warn('Redis connection closed');
    });

    // Attempt to connect
    redis.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err.message);
      redis = null;
    });

    return redis;
  } catch (error) {
    console.error('Error creating Redis client:', error);
    return null;
  }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('✅ Redis connection closed');
  }
}

/**
 * Check if Redis is available and connected
 */
export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}

export default getRedisClient;
