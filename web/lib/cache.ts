const STORAGE_PREFIX = "srw-cache:v1:";

type CacheEntry = {
  expiresAt: number;
  value: any;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

const isClient = () => typeof window !== "undefined";

function now() {
  return Date.now();
}

function buildStorageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

function readStorage(key: string): CacheEntry | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(buildStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= now()) {
      localStorage.removeItem(buildStorageKey(key));
      return null;
    }
    return parsed;
  } catch (err) {
    return null;
  }
}

function writeStorage(key: string, entry: CacheEntry) {
  if (!isClient()) return;
  try {
    localStorage.setItem(buildStorageKey(key), JSON.stringify(entry));
  } catch (err) {
    // storage may be full or unavailable; skip persistence
  }
}

function deleteStorage(key: string) {
  if (!isClient()) return;
  try {
    localStorage.removeItem(buildStorageKey(key));
  } catch (err) {
    // ignore
  }
}

function getFromCache(key: string): any | null {
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now()) return mem.value;

  const stored = readStorage(key);
  if (stored && stored.expiresAt > now()) {
    memoryCache.set(key, stored);
    return stored.value;
  }

  return null;
}

function setCache(key: string, value: any, ttlMs: number) {
  const entry: CacheEntry = { expiresAt: now() + ttlMs, value };
  memoryCache.set(key, entry);
  writeStorage(key, entry);
}

function deleteCache(key: string) {
  memoryCache.delete(key);
  deleteStorage(key);
}

export function buildCacheKey(key: string, token?: string | null) {
  return `${token || "anon"}:${key}`;
}

export function invalidateCacheByPrefix(prefixes: string | string[]) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  const keys = Array.from(memoryCache.keys());
  keys.forEach((key) => {
    if (list.some((p) => key.includes(p))) {
      memoryCache.delete(key);
    }
  });

  if (isClient()) {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(STORAGE_PREFIX)) continue;
      const logicalKey = storageKey.replace(STORAGE_PREFIX, "");
      if (list.some((p) => logicalKey.includes(p))) {
        localStorage.removeItem(storageKey);
      }
    }
  }
}

export async function fetchWithCache<T = any>(
  url: string,
  fetchOptions: RequestInit = {},
  cacheOptions: { cacheKey?: string; ttlMs?: number; forceRefresh?: boolean; parser?: (response: Response) => Promise<T> } = {}
): Promise<T> {
  const method = (fetchOptions.method || "GET").toString().toUpperCase();
  const ttlMs = cacheOptions.ttlMs ?? 5 * 60 * 1000;
  const cacheKey = cacheOptions.cacheKey || url;
  const shouldUseCache = method === "GET" && ttlMs > 0 && !cacheOptions.forceRefresh;

  if (shouldUseCache) {
    const cached = getFromCache(cacheKey);
    if (cached !== null) return cached as T;

    const inflightPromise = inflight.get(cacheKey);
    if (inflightPromise) return inflightPromise as Promise<T>;
  }

  const doFetch = (async () => {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || errorData.message || `Erro ao buscar ${url}`;
      throw new Error(message);
    }

    const parsed = cacheOptions.parser ? await cacheOptions.parser(response) : await response.json();

    if (shouldUseCache) {
      setCache(cacheKey, parsed, ttlMs);
    }

    return parsed as T;
  })();

  if (shouldUseCache) {
    inflight.set(cacheKey, doFetch);
  }

  try {
    return await doFetch;
  } finally {
    if (shouldUseCache) inflight.delete(cacheKey);
  }
}

export function clearAllCache() {
  memoryCache.clear();
  if (!isClient()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    // ignore
  }
}
