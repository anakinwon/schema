import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// 앱 페이지에 적용되는 전역 보안 헤더
// frame-ancestors 의도적 미설정:
//   Pi Browser는 null origin WebView iframe으로 앱을 로드함.
//   frame-ancestors에 어떤 origin('self' 포함)을 명시해도 null origin은 차단됨.
//   따라서 Pi Network 플랫폼 앱은 frame-ancestors를 설정할 수 없음.
//   완화 조치: HMAC 서명 쿠키(pi_session), sameSite=strict, Origin 헤더 검증으로 보완.
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.minepi.com",
      `connect-src 'self' ${supabaseUrl} https://open.er-api.com https://api.minepi.com`,
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
    ].join('; '),
  },
]

// Pi Browser가 직접 렌더링하지 않는 라우트 — frame 보호 적용 가능
// /auth/(*): Supabase OAuth 콜백 리다이렉트 (Pi Browser에서 직접 접근하지 않음)
// /api/(*): JSON 응답, iframe 임베딩 대상 아님
const frameProtectedHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Supabase OAuth 콜백 및 API 라우트는 Pi Browser가 iframe으로 로드하지 않으므로 보호
      {
        source: '/auth/(.*)',
        headers: frameProtectedHeaders,
      },
      {
        source: '/api/(.*)',
        headers: frameProtectedHeaders,
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
