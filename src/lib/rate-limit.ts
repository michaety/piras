/**
 * Fixed-window rate limiter backed by KV. Good enough for a single-seller
 * storefront's low-traffic write routes (contact form, downloads) — not
 * meant to withstand a distributed attack.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  opts: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const storeKey = `ratelimit:${key}`;
  const current = Number((await kv.get(storeKey)) ?? '0');

  if (current >= opts.limit) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(storeKey, String(current + 1), { expirationTtl: opts.windowSeconds });
  return { allowed: true, remaining: opts.limit - current - 1 };
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}
