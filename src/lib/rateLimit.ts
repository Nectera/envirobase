// Simple in-memory rate limiter
// In production, use Redis-backed rate limiting for multi-instance support

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(key);

  // If no entry or window expired, start fresh
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: entry.resetAt };
  }

  // Increment count
  entry.count++;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// Pre-configured limits
export const AI_ASSISTANT_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowSeconds: 60, // 20 requests per minute
};

export const API_WRITE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowSeconds: 60, // 60 writes per minute
};

export const API_READ_LIMIT: RateLimitConfig = {
  maxRequests: 120,
  windowSeconds: 60, // 120 reads per minute
};
