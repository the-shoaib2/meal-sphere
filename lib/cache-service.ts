import { getRedisClient } from './redis';

/**
 * Unified cache service with TTL management and invalidation strategies
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for grouped invalidation
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with optional TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const serialized = JSON.stringify(value);
    
    if (options.ttl) {
      await redis.setex(key, options.ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }

    // Store tags for grouped invalidation
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await redis.sadd(`tag:${tag}`, key);
        if (options.ttl) {
          // Set expiration on tag set as well
          await redis.expire(`tag:${tag}`, options.ttl);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete specific key from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Invalidate cache by tag
 */
export async function cacheInvalidateByTag(tag: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  try {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length === 0) return 0;

    // Delete all keys associated with this tag
    await redis.del(...keys);
    // Delete the tag set itself
    await redis.del(`tag:${tag}`);
    
    return keys.length;
  } catch (error) {
    console.error(`Cache invalidate by tag error for ${tag}:`, error);
    return 0;
  }
}

/**
 * Check if key exists in cache
 */
export async function cacheExists(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Cache exists error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get or set cache value (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // If not in cache, fetch the data
  const data = await fetcher();
  
  // Store in cache for next time
  await cacheSet(key, data, options);
  
  return data;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memory: string;
  hits?: number;
  misses?: number;
} | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const info = await redis.info('stats');
    const dbsize = await redis.dbsize();
    
    // Parse stats from info string
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    const memoryMatch = info.match(/used_memory_human:(.+)/);

    return {
      keys: dbsize,
      memory: memoryMatch ? memoryMatch[1].trim() : 'unknown',
      hits: hitsMatch ? parseInt(hitsMatch[1]) : undefined,
      misses: missesMatch ? parseInt(missesMatch[1]) : undefined,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

/**
 * Clear all cache (use with caution!)
 */
export async function cacheClearAll(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.flushdb();
    console.log('✅ All cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

/**
 * Batch get multiple keys
 */
export async function cacheMGet<T>(keys: string[]): Promise<(T | null)[]> {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) return keys.map(() => null);

  try {
    const values = await redis.mget(...keys);
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    });
  } catch (error) {
    console.error('Cache mget error:', error);
    return keys.map(() => null);
  }
}

/**
 * Batch set multiple keys
 */
export async function cacheMSet<T>(
  entries: Array<{ key: string; value: T; ttl?: number }>
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || entries.length === 0) return false;

  try {
    const pipeline = redis.pipeline();
    
    for (const entry of entries) {
      const serialized = JSON.stringify(entry.value);
      if (entry.ttl) {
        pipeline.setex(entry.key, entry.ttl, serialized);
      } else {
        pipeline.set(entry.key, serialized);
      }
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('Cache mset error:', error);
    return false;
  }
}
