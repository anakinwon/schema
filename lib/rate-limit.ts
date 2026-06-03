type RateLimitEntry = { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()

/**
 * IP 기반 메모리 Rate Limiter
 * @param key      고유 식별자 (IP 또는 "ip:endpoint" 조합 권장)
 * @param limit    허용 횟수
 * @param windowMs 윈도우 크기(ms)
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/** 클라이언트 IP 추출 (x-forwarded-for → x-real-ip → fallback) */
export function getClientIp(req: { headers: { get(key: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
