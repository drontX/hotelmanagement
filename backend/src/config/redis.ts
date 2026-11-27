import Redis from 'ioredis';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const memoryLocks = new Map<string, number>();

let redisClient: Redis | null = null;
let redisAvailable = false;
let redisInitAttempted = false;

function cleanupExpiredMemory(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

export function getRedisClient(): Redis | null {
  if (redisInitAttempted) {
    return redisClient;
  }
  redisInitAttempted = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 2) {
          redisAvailable = false;
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    client.on('connect', () => {
      redisAvailable = true;
    });

    client.on('ready', () => {
      redisAvailable = true;
    });

    client.on('error', () => {
      redisAvailable = false;
    });

    client.on('close', () => {
      redisAvailable = false;
    });

    client.connect().catch(() => {
      redisAvailable = false;
    });

    redisClient = client;
  } catch {
    redisAvailable = false;
    redisClient = null;
  }

  return redisClient;
}

export function isRedisConnected(): boolean {
  return redisAvailable && redisClient?.status === 'ready';
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  if (isRedisConnected() && redisClient) {
    try {
      const raw = await redisClient.get(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
      return null;
    } catch {
      redisAvailable = false;
    }
  }

  cleanupExpiredMemory();
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  const serialized = JSON.stringify(value);

  if (isRedisConnected() && redisClient) {
    try {
      if (ttlSeconds > 0) {
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, serialized);
      }
      return;
    } catch {
      redisAvailable = false;
    }
  }

  cleanupExpiredMemory();
  memoryCache.set(key, {
    value: serialized,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function deleteCache(key: string): Promise<void> {
  if (isRedisConnected() && redisClient) {
    try {
      await redisClient.del(key);
    } catch {
      redisAvailable = false;
    }
  }
  memoryCache.delete(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (isRedisConnected() && redisClient) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      redisAvailable = false;
    }
  }

  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
}

export async function acquireLock(key: string, ttlMs = 5000): Promise<boolean> {
  const lockKey = `lock:${key}`;
  if (isRedisConnected() && redisClient) {
    try {
      const result = await redisClient.set(lockKey, '1', 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch {
      redisAvailable = false;
    }
  }

  const now = Date.now();
  const existingExpiry = memoryLocks.get(lockKey);
  if (existingExpiry && existingExpiry > now) {
    return false;
  }
  memoryLocks.set(lockKey, now + ttlMs);
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  if (isRedisConnected() && redisClient) {
    try {
      await redisClient.del(lockKey);
    } catch {
      redisAvailable = false;
    }
  }
  memoryLocks.delete(lockKey);
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisAvailable = false;
  }
}

getRedisClient();
