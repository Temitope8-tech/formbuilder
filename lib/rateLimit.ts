type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const globalForRateLimit = globalThis as typeof globalThis & {
  rateLimitRequests?: Map<string, RateLimitEntry>;
};

const requests =
  globalForRateLimit.rateLimitRequests ??
  new Map<string, RateLimitEntry>();

globalForRateLimit.rateLimitRequests = requests;

export function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = requests.get(key);

  if (!existing || now >= existing.resetAt) {
    requests.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
    };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(
        (existing.resetAt - now) / 1000
      ),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
  };
}