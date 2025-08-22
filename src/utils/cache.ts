// utils/cache.ts

type CacheValue = any;

interface CacheEntry {
  value: CacheValue;
  expiresAt: number;
}

const cacheStore: Map<string, CacheEntry> = new Map();

/**
 * 
 * @param key 
 * @param value 
 * @param ttlMs 
 */
export function setCache(key: string, value: any, ttlMs: number = 5 * 60 * 1000): void {
  const expiresAt = Date.now() + ttlMs;
  cacheStore.set(key, { value, expiresAt });
}

/**
 * 
 * @param key 
 * @returns 
 */
export function getCached<T = any>(key: string): T | undefined {
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return undefined;
  }
  return entry.value as T;
}


export function clearCache(): void {
  cacheStore.clear();
}
