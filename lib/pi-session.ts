import crypto from 'crypto'

export function signPiSession(data: object): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET 환경 변수가 설정되지 않았습니다')
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyPiSession(cookie: string): Record<string, unknown> | null {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  const dotIdx = cookie.lastIndexOf('.')
  if (dotIdx === -1) return null
  const payload = cookie.slice(0, dotIdx)
  const sig = cookie.slice(dotIdx + 1)
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>
  } catch {
    return null
  }
}
