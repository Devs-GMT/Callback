/**
 * Fixed-window rate limiting for the AI routes.
 *
 * PRD section 4 asks for roughly 8 analyses per IP per day. Vercel functions
 * are stateless and scale to many instances, so an in-process counter would
 * reset on every cold start and let a caller through repeatedly. When Upstash
 * credentials are present the counter lives in Redis and the limit is real;
 * without them it falls back to an in-process map, which is enough for local
 * development and is reported honestly by `isDurable`.
 *
 * Upstash is reached over its REST API with plain `fetch`, so this costs no
 * extra dependency and works on any runtime.
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const isDurable = Boolean(REST_URL && REST_TOKEN);

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetAfter: number;
};

/* -------------------------------------------------------------------------- */
/* Client IP                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Best-effort client IP.
 *
 * On Vercel `x-forwarded-for` is set by the platform and its first entry is
 * the real client, so it is trustworthy here. Behind any other proxy it is
 * caller-controlled; the limit is a courtesy guard on a free endpoint rather
 * than a security boundary, which is why it is not hardened further.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

/* -------------------------------------------------------------------------- */
/* Upstash backend                                                            */
/* -------------------------------------------------------------------------- */

async function upstash(command: string[]): Promise<unknown> {
  const response = await fetch(`${REST_URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
  const body = (await response.json()) as { result?: unknown };
  return body.result;
}

/* -------------------------------------------------------------------------- */
/* In-process fallback                                                        */
/* -------------------------------------------------------------------------- */

const memory = new Map<string, { count: number; expiresAt: number }>();

function memoryConsume(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);

  if (!existing || existing.expiresAt <= now) {
    // Opportunistic sweep so a long-lived dev server does not grow unbounded.
    if (memory.size > 500) {
      for (const [k, v] of memory) if (v.expiresAt <= now) memory.delete(k);
    }
    memory.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, limit, remaining: limit - 1, resetAfter: windowSeconds };
  }

  existing.count += 1;
  const resetAfter = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
  return {
    allowed: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAfter,
  };
}

/* -------------------------------------------------------------------------- */

/** UTC day stamp, so the window is "per day" rather than a rolling 24 hours. */
function dayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Count one request against `bucket` for this IP.
 *
 * Never throws: if the Redis call fails the request is allowed through. A
 * degraded limiter must not take the whole feature down.
 */
export async function consume(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds = 24 * 60 * 60,
): Promise<RateLimitResult> {
  const key = `callback:rl:${bucket}:${dayStamp()}:${clientIp(request)}`;

  if (!isDurable) return memoryConsume(key, limit, windowSeconds);

  try {
    const count = Number(await upstash(["INCR", key]));
    if (count === 1) {
      // First hit in this window: give the key a TTL so it expires on its own.
      await upstash(["EXPIRE", key, String(windowSeconds)]);
    }
    const ttl = Number(await upstash(["TTL", key]));
    const resetAfter = Number.isFinite(ttl) && ttl > 0 ? ttl : windowSeconds;

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAfter,
    };
  } catch {
    return { allowed: true, limit, remaining: limit, resetAfter: windowSeconds };
  }
}

/** Standard rate-limit headers for a response. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAfter),
  };
}
