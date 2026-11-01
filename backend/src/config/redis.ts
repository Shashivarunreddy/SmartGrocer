import Redis from "ioredis";
import { ENV } from "./env";

// In-Memory Fallback Cache Entry
interface MemoryCacheEntry {
  data: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_ENTRIES = 1000;

let redisClient: Redis | null = null;
let isRedisConnected = false;

// Attempt Redis connection if REDIS_URL is provided, or default localhost
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying quickly to fallback smoothly to in-memory cache
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  redisClient.connect().then(() => {
    isRedisConnected = true;
    console.log("[Redis] Connected successfully to Redis Cache:", REDIS_URL.split("@").pop());
  }).catch((err) => {
    isRedisConnected = false;
    console.log("[Redis] Redis server not detected. Running seamlessly with high-performance In-Memory LRU cache fallback.");
  });

  redisClient.on("error", () => {
    isRedisConnected = false;
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
  });
} catch {
  isRedisConnected = false;
}

/**
 * Retrieve cached data by key
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch {
      // Fallback to memory on failure
    }
  }

  // Memory fallback
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    try {
      return JSON.parse(entry.data) as T;
    } catch {
      return null;
    }
  }
  if (entry && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
  }
  return null;
}

/**
 * Store data in cache with TTL in seconds (default 3600 = 1 hour)
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  const serialized = JSON.stringify(value);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, serialized, "EX", ttlSeconds);
      return;
    } catch {
      // Fallback to memory
    }
  }

  // Memory fallback
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    data: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate a single key or pattern
 */
export async function cacheDel(keyPattern: string): Promise<void> {
  if (isRedisConnected && redisClient) {
    try {
      if (keyPattern.includes("*")) {
        const keys = await redisClient.keys(keyPattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        await redisClient.del(keyPattern);
      }
      return;
    } catch {
      // Fallback
    }
  }

  // Memory fallback deletion
  if (keyPattern.includes("*")) {
    const regex = new RegExp("^" + keyPattern.replace(/\*/g, ".*") + "$");
    for (const k of Array.from(memoryCache.keys())) {
      if (regex.test(k)) {
        memoryCache.delete(k);
      }
    }
  } else {
    memoryCache.delete(keyPattern);
  }
}

/**
 * Diagnostic health stats for cache
 */
export function getCacheStats() {
  return {
    provider: isRedisConnected ? "REDIS_REMOTE" : "IN_MEMORY_LRU_FALLBACK",
    isConnected: isRedisConnected,
    memoryEntriesCount: memoryCache.size,
    maxMemoryEntries: MAX_MEMORY_ENTRIES,
  };
}

export { redisClient };
