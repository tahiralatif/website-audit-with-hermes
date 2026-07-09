/**
 * Simple in-memory sliding window rate limiter.
 * Max 5 audits per 10 minutes per user/IP.
 */

const MAX_REQUESTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Map of key -> [timestamp, ...]
const hits = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request is rate-limited.
 * @param {string} key - Unique identifier (userId or IP)
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key) {
  const now = Date.now();
  const timestamps = hits.get(key) || [];

  // Remove expired
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);

  if (valid.length >= MAX_REQUESTS) {
    const oldest = valid[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  // Record this hit
  valid.push(now);
  hits.set(key, valid);

  return { allowed: true, remaining: MAX_REQUESTS - valid.length, retryAfterMs: 0 };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request) {
  // Prefer X-Forwarded-For (behind reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // X-Real-IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return '127.0.0.1';
}
